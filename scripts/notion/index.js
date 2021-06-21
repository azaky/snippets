require("dotenv").config();

require("@babel/register")({
  presets: ["@babel/preset-react"],
});

require("./sync")();
