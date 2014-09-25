#!/bin/sh
#
# runtime constants
#
new_version=${NEW_VERSION:-"patch"}
#
# actual script
#
npm run build
git add -A
git commit

echo "Bumping to $new_version"
npm version $new_version -m "Bump to %s"

echo "Bump version completed"
echo "Please run \`npm publish\` and \`git push --tags\` manually"
npm version
