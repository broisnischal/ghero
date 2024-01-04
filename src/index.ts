#!/usr/bin/env node
// Created by @neeswebservices
import { Command } from "commander";
import { execSync } from "child_process";
import * as path from "path";
import { format, differenceInMinutes } from "date-fns";
import * as fs from "fs";
import readline from "readline";
import { spawn } from "child_process";
import branchName from "current-git-branch";
import { commitmessage } from "./test";

const program = new Command();
const TARGET = 17;
program.version("1.0.0");

const getBranchName = (): string => {
  return branchName() || "master";
};

const formatFolderName = (name: string): string => {
  return name.split(" ").join("-").toLowerCase();
};

const isNodeModulesIgnored = (): boolean => {
  const gitIgnoreContent = fs.readFileSync(".gitignore", "utf-8");
  return gitIgnoreContent.includes("node_modules");
};

function greaterTimeThanTarget(target: number = TARGET): boolean {
  const now = new Date();
  const targetTime = new Date(now);
  targetTime.setHours(target, 0, 0, 0);
  return now > targetTime;
}

function calculateTimeDifference(): number | null {
  const now = new Date();
  const targetTime = new Date(now);
  targetTime.setHours(TARGET, 0, 0, 0);

  if (now > targetTime) {
    return differenceInMinutes(now, targetTime);
  } else {
    return null;
  }
}

async function commit(commitMessage?: string) {
  let message;
  // asdf
  if (!commitMessage) {
    console.log("asdf");
    message = await commitmessage();
  }

  const daaaa = await commitmessage();

  console.log(daaaa);

  console.log(message);

  execSync("git add .");
  const commitProcess = spawn("git", ["commit", "-m", message as string]);

  commitProcess.stdout.on("data", (data) => {
    console.log(data.toString());
  });

  commitProcess.stderr.on("data", (data) => {
    console.error(data.toString());
  });

  commitProcess.on("close", (code) => {
    if (code === 0) {
      if (!greaterTimeThanTarget()) {
        return console.log("Git commit successful.");
      }

      console.log("Git commit successfull!");
      console.log(
        `😆 you worked ${calculateTimeDifference()} minutes more today!`
      );

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(
        `Do you want to push to ${getBranchName()} branch? (y/N): \n`,
        (answer) => {
          rl.close();
          if (answer.toLowerCase() === "y") {
            push();
          } else {
            process.exit(0);
          }
        }
      );
    } else {
      if (code === 1) {
      } else {
        console.error(`Error making Git commit. Exit code: ${code}`);
      }
    }
  });
}

function push() {
  try {
    const branchName = getBranchName();
    const pushProcess = spawn("git", ["push", "origin", branchName]);

    pushProcess.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    pushProcess.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    pushProcess.on("close", (code) => {
      if (code === 0) {
        console.log(
          `Git push successful. see you tomorrow! ${format(
            new Date(),
            "HH:mm"
          )}`
        );
      } else {
        console.error(`Git push failed with exit code ${code}.`);
      }
    });
  } catch (err: any) {
    console.error("Error making Git push:", err.message);
  }
}

program
  .command("commit")
  .argument("[commit message]", "The commit message")
  .action((message: string = "") => {
    let commitMessages = message.length > 0;
    const projectFolderName = path.basename(process.cwd());
    const date = format(new Date(), "yyyy-MM-dd HH:mm");
    const commitMessage = `${date} | ${formatFolderName(
      projectFolderName
    )} - ${message}`;
    // execSync(`git add .`, { stdio: "inherit" });

    if (!isNodeModulesIgnored()) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(
        "missing \x1b[1mnode_modules\x1b[0m in .gitignore, Are you sure want to commit? (y/N): ",
        (answer) => {
          rl.close();
          if (answer.toLocaleLowerCase() === "y") {
            if (!commitMessages) {
              commit(commitMessage);
            } else {
              commit();
            }
          } else if (answer.toLocaleLowerCase() === "n") {
            console.log("Go add node_modules to .gitignore");
            process.exit(0);
          } else {
            console.log("Please enter y or n");
          }
        }
      );
    } else {
      commit(commitMessage);
    }
  });

program
  .command("push")
  .description(`Push a branch ${getBranchName()} to the remote repository`)
  .action(push);

program.parse(process.argv);
