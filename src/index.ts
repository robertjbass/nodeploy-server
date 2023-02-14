import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/core";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const prod = process.env.NODE_ENV === "production";

const privateKey = process.env.GH_APP_PRIVATE_KEY as string;
const appId = process.env.GH_APP_ID as any as number;
const clientId = process.env.GH_CLIENT_ID as string;
const clientSecret = process.env.GH_CLIENT_SECRET as string;

const INSTALLATION_ID = 34116679;

const installationOctokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    installationId: INSTALLATION_ID,
    appId: appId,
    privateKey: privateKey,
    clientId: clientId,
    clientSecret: clientSecret,
  },
});

const getAllRepos = async () => {
  let repos: any[] = [];
  let page = 1;
  let per_page = 100;
  let keepGoing = true;

  while (keepGoing) {
    const { data } = await installationOctokit.request(
      `GET /installation/repositories?page=${page}&per_page=${per_page}`
    );

    repos = repos.concat(
      data.repositories.map((repo: any) => {
        return {
          id: repo.id,
          name: repo.full_name,
        };
      })
    );

    page++;
    keepGoing = data.repositories.length === per_page;
  }
  // console.log(repos);

  return repos;
};

// TODO - rethink this whole thing
const getRepoByName = async (repoName: string) => {
  const repoContents = (await installationOctokit.request(`GET /repos/${repoName}/contents`)).data;

  const [user, repo] = repoName.split("/");
  const repoPath = "./tmp/" + user;
  const destinationPath = `./tmp/${user}/${repo}`;
  // make destnation path folder
  if (!fs.existsSync("./tmp")) {
    fs.mkdirSync("./tmp");
  }

  if (!fs.existsSync(repoPath)) {
    fs.mkdirSync(repoPath);
  }

  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath);
  }

  const allFilePaths = repoContents
    .map((file: any) => {
      return {
        fileName: file.name,
        filePath: file.path,
        fileType: file.type,
      };
    })
    .filter(({ fileType }: any) => fileType !== "file")
    .map(({ filePath }: any) => filePath);

  allFilePaths.forEach((filePath: any) => {
    const path = `${destinationPath}/${filePath}`;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
  });

  const writeFile = (file: any) => {
    const fileName = file.name;
    const [name, ext] = fileName.split(".");
    const filePath = `${destinationPath}/${name}.${ext}`;
    const content = Buffer.from(file.content, "base64").toString("utf8");
    console.log("writing", { fileName, filePath });
    fs.writeFileSync(filePath, content);
  };

  repoContents.forEach(async ({ name }: any) => {
    const file = (await installationOctokit.request(`GET /repos/${repoName}/contents/${name}`))
      .data;

    // check if file is array or object
    const fileIsArray = Array.isArray(file);
    console.log({ fileIsArray });

    // create a reducer function to handle nested files

    // TODO - THIS NEEDS TO BE A RECURSIVE FUNCTION
    if (!fileIsArray) {
      writeFile(file);
    }
  });

  console.log("Saved files to disk");
};

(async () => {
  const repos = await getAllRepos();

  const repoToPull = repos.find((repo) => repo.id === 402098960);

  await getRepoByName(repoToPull.name);
})();

console.log("Hello World", prod);
