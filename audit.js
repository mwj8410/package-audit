/* global require */

const fs = require('fs');
const path = require('path');

// Classes
class Dependency {
  constructor(key, version) {
    this.name = key;
    this.version = version;
    this.uses = 0;
    this.usedBy = [];
  }
}

// Helper Functions
const flatten = arr => arr.reduce((acc, val) =>
  acc.concat(Array.isArray(val) ? flatten(val) : val), []);

const walkSync = dir => fs.readdirSync(dir)
  .map(file => fs.statSync(path.join(dir, file)).isDirectory()
    ? walkSync(path.join(dir, file)) : path.join(dir, file).replace(/\\/g, '/'));

// Procedure
console.log('Starting Node Package Audit.');

const packageFile = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));


const deps = Object.keys(packageFile.dependencies)
  .map((key) => new Dependency(key, packageFile.dependencies[ key ]))
  .concat(
    Object.keys(packageFile.devDependencies)
      .map((key) => new Dependency(key, packageFile.dependencies[ key ]))
  );


// Collect all files
const allApplicationCodeFiles = flatten(walkSync(path.resolve('./')))
    .filter((item) => !(/node_modules/.test(item)) && /.js$/.test(item) || /.jsx$/.test(item));

// Split the list into to batches.
// const applicationFiles = allApplicationCodeFiles.filter((item) => !(/node_modules/.test(item)));
// const moduleFiles = allApplicationCodeFiles.filter((item) => /node_modules/.test(item));

console.log(allApplicationCodeFiles.length)

allApplicationCodeFiles.forEach((applicationFile) => {
  // open the file and read the dependencies
  let fileContents = fs.readFileSync(path.resolve(applicationFile), 'utf8');

  let thisMatch = fileContents.match(/(require\s*\(|import\s.*\sfrom\s)(\"|\')/);
  let thisPackageName

  while (thisMatch && thisMatch[0]) {
    // Get the package Name
    thisPackageName = fileContents.substr(thisMatch.index + thisMatch[0].length - 1).match(/('|")[a-zA-Z0-9_\-]*('|")/)

    // Register the package as having been used and by whom
    if (thisPackageName) {
      console.log(applicationFile + ' ' + thisPackageName[0].substr(1, thisPackageName[0].length - 2))
      let dep = deps.filter((pkg) => pkg.name === thisPackageName[0].substr(1, thisPackageName[0].length - 2));

      // If it is a package require
      if (dep[0]) {
        console.log('Registering');
        dep[0].uses += 1;
        dep[0].usedBy.push(applicationFile)
      }
    }

    // Continue the search
    fileContents = fileContents.substr(thisMatch.index + thisMatch[0].length)
    thisMatch = fileContents.match(/(require\s*\(|import\s.*\sfrom\s)(\"|\')/);
  }

});

console.log(deps)
