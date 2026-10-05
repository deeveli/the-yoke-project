import jsonfile from "jsonfile";
import moment from "moment";
import { simpleGit } from "simple-git";
import random from "random";

const path = "./data.json";
const git = simpleGit();

/**
 * ==========================================
 * CONFIG
 * ==========================================
 */

const DELETE_COMMITS_FROM = "2026-10-06";

/**
 * ==========================================
 * GENERATE COMMITS
 * ==========================================
 */

const markCommit = (x, y) => {
  const date = moment()
    .subtract(1, "y")
    .add(1, "d")
    .add(x, "w")
    .add(y, "d")
    .format();

  const data = {
    date,
  };

  jsonfile.writeFile(path, data, () => {
    git
      .add([path])
      .commit(date, {
        "--date": date,
      })
      .push();
  });
};

const makeCommits = (n) => {
  if (n === 0) {
    console.log("Finished creating commits.");
    return git.push();
  }

  const x = random.int(0, 54);
  const y = random.int(0, 6);

  const date = moment()
    .subtract(2, "y")
    .add(1, "d")
    .add(x, "w")
    .add(y, "d")
    .format();

  const data = {
    date,
  };

  console.log(`Creating commit: ${date}`);

  jsonfile.writeFile(path, data, () => {
    git.add([path]).commit(
      date,
      {
        "--date": date,
      },
      makeCommits.bind(this, --n),
    );
  });
};

/**
 * ==========================================
 * DELETE COMMITS FROM DATE
 * ==========================================
 *
 * Deletes every commit whose date is
 * DELETE_COMMITS_FROM or later.
 *
 * Example:
 *
 * 2026-10-05  -> KEEP
 * 2026-10-06  -> DELETE
 * 2026-10-07  -> DELETE
 * 2026-10-20  -> DELETE
 */

const deleteCommitsFromDate = async (cutoffDate) => {
  console.log(`\nDeleting commits from ${cutoffDate} onwards...\n`);

  const log = await git.raw(["log", "--format=%H|%aI", "--all"]);

  const commitsToDelete = log
    .trim()
    .split("\n")
    .filter(Boolean)
    .filter((line) => {
      const [, date] = line.split("|");

      return moment(date).isSameOrAfter(moment(cutoffDate), "day");
    })
    .map((line) => line.split("|")[0]);

  if (commitsToDelete.length === 0) {
    console.log("No commits found after the cutoff date.");
    return;
  }

  console.log(`Found ${commitsToDelete.length} commit(s) to remove.`);

  /**
   * Use git filter-repo for reliable history rewriting.
   *
   * This removes commits based on their commit date.
   */

  const cutoffTimestamp = moment(cutoffDate)
    .startOf("day")
    .format("YYYY-MM-DDTHH:mm:ss");

  await git.raw([
    "filter-branch",
    "--commit-filter",
    `
      if [ "$(git show -s --format=%aI "$GIT_COMMIT")" \> "${cutoffTimestamp}" ];
      then
        skip_commit "\$@";
      else
        git commit-tree "\$@";
      fi
    `,
    "--",
    "--all",
  ]);

  console.log("\nCommits removed successfully.");
  console.log(`Cutoff: ${cutoffDate} and everything after it`);

  console.log("\nIf these commits were already pushed to GitHub, run:");

  console.log("\n  git push --force --all origin");
};

/**
 * ==========================================
 * RUN
 * ==========================================
 */

// Generate 500 commits
// makeCommits(500);

// To delete commits instead, comment out the line above
// and uncomment the line below:
//
deleteCommitsFromDate(DELETE_COMMITS_FROM);
