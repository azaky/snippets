const fs = require("fs");
const path = require("path");
const util = require("util");
const dateformat = require("dateformat");
const yaml = require("js-yaml");
const { Client } = require("@notionhq/client");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const { NotionAPI } = require("notion-client");
const { NotionRenderer } = require("react-notion-x");
const { JSDOM } = require("jsdom");
const { html_beautify } = require("js-beautify");

const Code = (props) => {
  const { code, language } = props;
  return (
    <pre className="notion-code">
      <code className={`language-${language || "javascript"}`}>{code}</code>
    </pre>
  );
};

const Equation = (props) => {
  const { math, block } = props;
  return (
    <span>
      {block ? "$$" : "\\("}
      {math}
      {block ? "$$" : "\\)"}
    </span>
  );
};

const root = path.join(__dirname, "../..");
const postsFilename = path.join(root, "posts.json");

const notion = new Client({ auth: process.env.NOTION_KEY });
const notionXClient = new NotionAPI();

const dump = (obj) => console.log(util.inspect(obj, { depth: Infinity }));
const dumpJSONToFile = (obj, filename) =>
  fs.writeFileSync(filename, JSON.stringify(obj, null, 2), "utf8");
const dumpStringToFile = (str, filename) =>
  fs.writeFileSync(filename, str, "utf8");

module.exports = async () => {
  const postsRoot = path.join(root, "_posts");
  if (!fs.existsSync(postsRoot)) {
    fs.mkdirSync(postsRoot);
  }

  let previousPosts = [];
  let lastSync = new Date(0);
  if (fs.existsSync(postsFilename)) {
    const prevData = JSON.parse(fs.readFileSync(postsFilename, "utf8"));
    previousPosts = prevData.posts;
    lastSync = new Date(prevData.lastSync);
  }

  const now = new Date();

  let updated = false;
  const posts = [];
  const uniqueTags = new Set();
  const actions = [];

  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    // When filtered by last edited, we can't possibly know if a post is deleted or not.
    // filter: {
    //   property: "Last edited time",
    //   date: {
    //     after: dateformat(lastSync, "isoUtcDateTime"),
    //   },
    // },
  });

  console.log(`Found ${response.results.length} posts from Notion`);

  for (const page of response.results) {
    const { id, last_edited_time, created_time } = page;

    const title = page.properties.Title?.title?.[0]?.plain_text;
    const tags = (page.properties.Tags?.multi_select ?? []).map(
      (tag) => tag.name
    );
    const date = new Date(page.properties.Date?.date?.start ?? created_time);

    console.log(`Processing post id = ${id}, title = ${title}`);

    tags.forEach(tag => uniqueTags.add(tag));

    const previousData = previousPosts.find((data) => data.id === id);

    if (previousData) {
      let previousDataValid = true;
      if (!previousData.id) {
        console.warn(`Warning: previous data exists but id is missing.`);
        previousDataValid = false;
      }
      if (!previousData.title) {
        console.warn(`Warning: previous data exists but title is missing.`);
        previousDataValid = false;
      }
      if (!previousData.filename) {
        console.warn(`Warning: previous data exists but filename is missing.`);
        previousDataValid = false;
      }
      if (!previousData.last_edited_time) {
        console.warn(
          `Warning: previous data exists but last_edited_time is missing.`
        );
        previousDataValid = false;
      }

      if (
        previousDataValid &&
        previousData.last_edited_time == last_edited_time &&
        fs.existsSync(path.join(root, "_posts", previousData.filename))
      ) {
        console.log(`Last edited time does not change, skipping`);
        posts.push(previousData);
        continue;
      }
    }

    const recordMap = await notionXClient.getPage(id);
    let html = ReactDOMServer.renderToStaticMarkup(
      <NotionRenderer
        recordMap={recordMap}
        components={{
          code: Code,
          collection: () => null,
          collectionRow: () => null,
          equation: Equation,
        }}
      />
    );

    // Remove class="notion-block-uuid" everywhere.
    html = html.replace(
      / ?notion-block-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
      ""
    );

    // Get post excerpt from first notion-text block, if any.
    const dom = new JSDOM(html);
    const firstParagraph =
      dom.window.document.getElementsByClassName("notion-text")[0];
    const excerpt = firstParagraph?.textContent;

    const frontMatter = {
      layout: "post",
      title,
      date: dateformat(date, "yyyy-mm-dd HH:MM:ss p", true),
      tags,
      excerpt,
      notion_id: id.replace(/\-/g, ""),
    };

    const titleParamCase = title
      .split(/\W/g)
      .filter((t) => !!t)
      .map((t) => t.toLowerCase())
      .join("-");
    const filename = `${dateformat(
      date,
      "yyyy-mm-dd",
      true
    )}-${titleParamCase}.html`;

    // Erase previous file first, in case filename changes.
    if (previousData?.filename) {
      try {
        fs.rmSync(path.join(postsRoot, previousData.filename));
      } catch (e) {
        console.warn("Error occurred when removing previous file:", e);
      }
    }

    const formattedFrontMatter = [
      "---",
      yaml.dump(frontMatter, { lineWidth: 80 }).replace(/\\n$/, ""),
      "---",
    ].join("\n");

    const formattedHtml = html_beautify(html, {
      indent_size: 2,
      wrap_line_length: 80,
    });

    fs.writeFileSync(
      path.join(postsRoot, filename),
      formattedFrontMatter + "\n\n" + formattedHtml,
      "utf8"
    );

    posts.push({
      id,
      title,
      filename,
      date,
      last_edited_time,
    });

    updated = true;
    if (previousData) {
      actions.push(`Update "${title}"`);
    } else {
      actions.push(`Add "${title}"`);
    }

    console.log(`Processing post id = ${id}, title = ${title} done!`);
  }

  if (!updated) {
    console.log("No changes found");
    return;
  }

  console.log("Processing tags ...");

  console.log(`Found ${uniqueTags.size} tags`);

  const tagsRoot = path.join(root, "_tags");
  if (fs.existsSync(tagsRoot)) {
    fs.rmSync(tagsRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(tagsRoot);
  for (const tag of uniqueTags) {
    fs.writeFileSync(
      path.join(tagsRoot, `${tag}.md`),
      ["---", yaml.dump({ layout: "tag", tag }), "---"].join("\n"),
      "utf8"
    );
  }
  console.log("Processing tags done!");

  console.log("Exporting posts.json ...");
  posts.sort((a, b) => a.date < b.date ? -1 : 1);
  fs.writeFileSync(
    postsFilename,
    JSON.stringify({ last_sync: now, posts }, null, 2),
    "utf8"
  );
  console.log("Exporting posts.json done!");

  // A workaround to set commit message.
  let message = "sync_notion:";
  if (actions.length === 1) {
    message = `sync_notion: ${actions[0]}`;
  } else if (actions.length > 1) {
    message = [
      `sync_notion: multiple actions`,
      ...actions.map((s) => `- ${s}`),
    ].join("\n");
  }
  fs.writeFileSync(path.join(root, "COMMIT_MESSAGE"), message + "\n", "utf8");
};
