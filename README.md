# Svelte Check Action

This action runs [svelte-check](http://npmjs.com/svelte-check) on the files that change in a PR (by default), then adds a comment which reports any errors in those files. The inspiration came from wanting to have svelte-check run in CI without failing, so that we can progressively fix a codebase with a lot of issues.

Works with svelte-check version 3 & 4. The action runs using Node 20.

## Example

```yaml
name: Svelte Check

on:
    - pull_request

jobs:
    demo:
        runs-on: ubuntu-latest
        steps:
            - name: Checkout
              uses: actions/checkout@v4

            # You can replace these steps with your specific setup steps
            # This example assumes Node 22 and pnpm 10
            - name: Setup Node 22
              uses: actions/setup-node@v4
              with:
                  node-version: 22
                  registry-url: https://registry.npmjs.org/

            - name: Setup PNPM
              uses: pnpm/action-setup@v4.1.0
              with:
                  version: 10.11.1

            - name: Install
              run: pnpm install

            # Run the svelte check action
            - name: Svelte Check
              uses: ghostdevv/svelte-check-action@v1
```

This will add a comment to your PRs with any errors, for example:

![example comment](./.github/example-comment.png)

## Options

| Option          | Description                                                                                                                                                                                                              | Default               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| `paths`         | The folder(s) to run svelte-check in, one per line. It'll only run svelte-check if files in that folder have changed. `svelte-kit sync` will be ran before diagnostics if SvelteKit is found at the folder package.json. | `.`                   |
| `filterChanges` | When true only the files that change (in the pull request) will be checked                                                                                                                                               | `true`                |
| `failOnError`   | Should we cause CI to fail if there is a Svelte Check error?                                                                                                                                                             | `false`               |
| `failOnWarning` | Should we cause CI to fail if there is a Svelte Check warning?                                                                                                                                                           | `false`               |
| `failFilter`    | When failFilter is set and either failOnError or failOnWarning is enabled, the action will only fail for issues that occur in paths matching these globes.                                                               | Disabled              |
| `token`         | The GitHub token used to authenticate with the GitHub API. By default, GitHub generates a token for the workflow run - which we use. You can provide your own token if you like.                                         | `${{ github.token }}` |

You can configure the action by passing the options under the `with` key, for example:

```yaml
- name: Svelte Check
  uses: ghostdevv/svelte-check-action@v1
  with:
      paths: |
          ./packages/app
  env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Deprecated Options (will be removed in next major release)

- Setting `GITHUB_TOKEN` environment variable is deprecated, please remove it completely if you want to use the default token managed by GitHub - or set your own using the `token` option.
