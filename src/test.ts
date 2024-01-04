import "dotenv/config";
import { execSync } from "child_process";
import "colors";
import * as Diff from "diff";
import sqlite3 from "sqlite3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";

const dbFilePath = path.join(__dirname, "main.db");

const db = new sqlite3.Database(dbFilePath);

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS apikeys (key TEXT)");
});

const getPreviousCommitDetails = () => {
  try {
    const commitDetails = execSync(
      'git log -1 HEAD^ --pretty=format:"%H %an %s"'
    )
      .toString()
      .trim();
    console.log(commitDetails);
  } catch (error) {
    console.error("Error fetching previous commit details:", error);
  }
};

const excludedFiles = [
  ":!package.json",
  ":!package-lock.json",
  ":!tsconfig.json",
  ":!node_modules/**/*",
];

// getPreviousCommitDetails();

const getCommittedTextData = () => {
  try {
    const committedTextData = execSync(
      `git diff HEAD^ -- . ${excludedFiles.join(" ")}`
    ).toString();
    return committedTextData;
  } catch (error) {
    console.error("Error fetching committed text data:", error);
  }
};

const insertAPIKey = (apiKey: string) => {
  const insertStmt = db.prepare("INSERT INTO apikeys (key) VALUES (?)");
  insertStmt.run(apiKey);
  insertStmt.finalize();
};

const getFirstAPIKey = () => {
  return new Promise<string>((resolve, reject) => {
    db.get("SELECT key FROM apikeys LIMIT 1", (err, row) => {
      if (err) {
        reject(err);
      } else {
        // @ts-expect-error
        resolve(row ? row.key : null);
      }
    });
  });
};

const inquirer = require("inquirer");
const prompt = inquirer.createPromptModule();

const one = "beep boop";
const other = "beep boob blah";
export const commitmessage = async () => {
  const key = await getFirstAPIKey();

  if (!key) {
    await inquirer
      .prompt([
        {
          type: "Token",
          name: "input",
          message: "Please submit your Gemeni API Token.",
        },
      ])
      .then((val: any) => {
        // console.log(val);
        // Use user feedback for... whatever!!
        insertAPIKey(val.input);
        console.log("Your token have been stored");
      })
      .catch((error: any) => {
        if (error.isTtyError) {
          // Prompt couldn't be rendered in the current environment
        } else {
          // Something else went wrong
        }
      });
  }

  // const diff = Diff.diffChars(one, other);

  // diff.forEach((part) => {
  //   const color = part.added ? "green" : part.removed ? "red" : "grey";
  //   process.stderr.write(part.value[color]);
  // });

  // console.log();

  const data = getCommittedTextData();
  // console.log(data);

  const ai = new GoogleGenerativeAI(process.env.GEMENI!);

  const model = ai.getGenerativeModel({
    model: "gemini-pro",
  });

  // added comment

  const prompt = `
    ${data}

    ---
    Write the short and main informative commit message, 

    feat: add thing
    fix: broken thing
    refactor: ugly thing
    chore: boring thing
    
    it should be minimal and short minimum of 25 words and no more than 50 words and make sure in this structure and make sure only one line!

  `;

  try {
    const result = await model.generateContent(prompt);

    const response = result.response;

    const text = response.text();
    return text;
  } catch (error) {
    console.log(error);
    return error;
  }
};
