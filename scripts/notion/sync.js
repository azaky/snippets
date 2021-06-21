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
const manifestFilename = path.join(root, "manifest.json");

const notion = new Client({ auth: process.env.NOTION_KEY });
const notionXClient = new NotionAPI();

const dump = (obj) => console.log(util.inspect(obj, { depth: Infinity }));
const dumpJSONToFile = (obj, filename) =>
  fs.writeFileSync(filename, JSON.stringify(obj, null, 2), "utf8");
const dumpStringToFile = (str, filename) =>
  fs.writeFileSync(filename, str, "utf8");

module.exports = async () => {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
  });

  const postsRoot = path.join(root, "_posts");
  if (!fs.existsSync(postsRoot)) {
    fs.mkdirSync(postsRoot);
  }

  console.log(`Found ${response.results.length} posts from Notion`);

  let previousManifests = [];
  if (fs.existsSync(manifestFilename)) {
    previousManifests = JSON.parse(fs.readFileSync(manifestFilename, "utf8"));
  }
  const manifests = [];
  const allTags = [];
  const actions = [];

  for (const page of response.results) {
    const { id, last_edited_time, created_time } = page;

    const title = page.properties.Title?.title?.[0]?.plain_text;
    const tags = (page.properties.Tags?.multi_select ?? []).map(
      (tag) => tag.name
    );
    const date = page.properties.Date?.date?.start ?? created_time;

    console.log(`Processing post id = ${id}, title = ${title}`);

    allTags.push(...tags);

    const previousData = previousManifests.find((data) => data.id === id);

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
        manifests.push(previousData);
        continue;
      }
    }

    const recordMap = await notionXClient.getPage(id);
    const html = ReactDOMServer.renderToStaticMarkup(
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

    // Get post excerpt from first notion-text block, if any.
    const dom = new JSDOM(html);
    const firstParagraph =
      dom.window.document.getElementsByClassName("notion-text")[0];
    const excerpt = firstParagraph?.textContent;

    const frontMatter = {
      layout: "post",
      title,
      date: dateformat(date, "yyyy-mm-dd HH:MM:ss p"),
      tags,
      excerpt,
      notion_id: id.replace(/\-/g, ""),
    };

    const titleParamCase = title
      .split(/\W/g)
      .filter((t) => !!t)
      .map((t) => t.toLowerCase())
      .join("-");
    const filename = `${dateformat(date, "yyyy-mm-dd")}-${titleParamCase}.html`;

    // Erase previous file first, in case filename changes.
    if (previousData?.filename) {
      try {
        fs.rmSync(path.join(postsRoot, previousData.filename));
      } catch (e) {
        console.warn("Error occurred when removing previous file:", e);
      }
    }

    fs.writeFileSync(
      path.join(postsRoot, filename),
      ["---", yaml.dump(frontMatter), "---", "", html].join("\n"),
      "utf8"
    );

    manifests.push({
      id,
      title,
      filename,
      last_edited_time,
    });

    if (previousData) {
      actions.push(`Update "${title}"`);
    } else {
      actions.push(`Add "${title}"`);
    }

    console.log(`Processing post id = ${id}, title = ${title} done!`);
  }

  console.log("Processing tags ...");

  const uniqueTags = [...new Set(allTags)];
  console.log(`Found ${uniqueTags.length} tags`);

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

  console.log("Exporting manifest.json ...");
  fs.writeFileSync(manifestFilename, JSON.stringify(manifests), "utf8");
  console.log("Exporting manifest.json done!");

  // A workaround to set commit message.
  let message = "sync_notion:";
  if (actions.length === 1) {
    message = `sync_notion: ${actions[0]}`;
  } else if (actions.length > 1) {
    message = [`sync_notion: multiple actions`, ...actions.map(s => `- ${s}`)].join("\n");
  }
  fs.writeFileSync(path.join(root, "COMMIT_MESSAGE"), message + "\n", "utf8");
};
