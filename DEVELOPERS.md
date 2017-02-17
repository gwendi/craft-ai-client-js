# Developers instructions #

## Running the tests locally ##

1. Retrieve your **craft ai** _owner_ and _token_.
2. On your dev machine, at the root of your clone, create a file named `.env` with the following content

  ```
  CRAFT_OWNER=<retrieved_owner>
  CRAFT_TOKEN=<retrieved_token>
  ```

3. Run `npm install` to install dependencies
4. You can run the following `npm` scripts:
  - `npm run test_node` launches the tests in a nodejs context,
  - `npm run dev_browser` launches an auto-reload test server in a browser
  context at <http://localhost:8080/webpack-dev-server/>,
  - `npm run lint` checks the coding style.

## Releasing a new version (needs administrator rights) ##

1. Make sure the build of the master branch is passing
[![Build](https://img.shields.io/travis/craft-ai/craft-ai-client-js/master.svg?style=flat-square)](https://travis-ci.org/craft-ai/craft-ai-client-js)
2. Checkout the master branch locally

  ```sh
  git fetch
  git checkout master
  git reset --hard origin/master
  ```

3. Make sure the `README.md` is up to date with the _central_ documentation

  ```sh
  npm run update_readme
  git commit -a -m"Update README.md from upstream"
  ```

3. Bump the version and push

  ```sh
  npm version patch
  git push origin master
  git push --tags
  ```
