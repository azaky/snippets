require("dotenv").config();

require("@babel/register")({
  presets: ["@babel/preset-react"],
});

require("./sync")().catch((e) => {
  console.error(e);
  process.exit(1);
});
