const { createHash } = require('node:crypto');
const { createReadStream, createWriteStream } = require('node:fs');
const archiver = require('archiver');

const { Client } = require('exaroton');

// Get the Exaroton "client" object
const client = new Client(process.env.TOKEN);

// Create a server variable to be set later
let server = null

async function init() {
  server = await getServerByName('wpMoreCraft')

  // 1. Bundle updated resource pack
  console.log('Bundling updated resource pack...')
  const { fileSize, outputFilename, outputPath } = await bundleTexturePack('texturePack')
  console.log(`A new ${ fileSize } resource pack has been bundled at "${ outputPath }"`)
  console.log('---')

  // 2. Get current hash from server.properties / resource-pack-sha1
  console.log('Checking for an existing "texture-pack-sha1" hash...')

  const oldHash = await getFileConfigValue('server.properties', 'resource-pack-sha1')
  if (oldHash) {
    console.log(`Found an existing "resource-pack-sha1" value of "${ oldHash }"`)
  } else {
    console.log('No existing "resource-pack-sha1" value found')
  }
  console.log('---')

  // 3. Get new hash based on the updated texture pack archive
  console.log('Generating a new hash from the newly bundled resource pack...')
  const newHash = await getHashFromFile('texturePack.zip');
  console.log(`Generated the following hash to replace "resource-pack-sha1": "${ newHash }"`)
  
  // 4. Compare the new and old hashes
  if (oldHash && oldHash == newHash) console.log('⚠️ Warning: The new & old hash match')
  
  console.log('---')
  
  // 5. Update server.properties
  // a. resource-pack
  if (outputPath) {
    console.log('Updating the "resource-pack" value...')

    const idealPath = `https://github.com/JakeAdmire/morecraft-resources/raw/main/buid/${ outputFilename }`

    await setFileConfigValue('server.properties', 'resource-pack', outputPath)

    console.log('Updated the value of "resource-pack" and saved the server.properties config')
    console.log('---')
  }

  //  b. resource-pack-sha1
  if (newHash) {
    console.log('Updating the "resource-pack-sha1" value...')

    await setFileConfigValue('server.properties', 'resource-pack-sha1', newHash)

    console.log('Updated the value of "resource-pack-sha1" and saved the server.properties config')
    console.log('---')
  }

  // 6. Wait for the next restart? 
  // How do we force it to reload without restarting the server? 
}

// * Utilities

async function getFileConfigValue(fileName, optionName) {
  let file = server.getFile(fileName);
  let config = file.getConfig();
  let options = await config.getOptions();
  
  const optionValue = options.get(optionName).getValue()

  return optionValue
}

async function setFileConfigValue(fileName, optionName, newValue) {
  let file = server.getFile(fileName);
  let config = file.getConfig();
  let options = await config.getOptions();

  options.get(optionName).setValue(newValue)

  await config.save();
}

const bundleTexturePack = (directory = 'texturePack') => new Promise((resolve, reject) => {
  const outputFilename = `${Date.now()}.zip`
  const outputPath = `${__dirname}/build/${outputFilename}`
  const output = createWriteStream(outputPath);
  const archive = archiver('zip');

  archive.directory(directory, false);
  archive.pipe(output);

  output.on('close', function () {
    const bytes = archive.pointer()
    const megabytes = Math.round((bytes / 1000000) * 10) / 10

    resolve({ fileSize: `${ megabytes }mb`, outputFilename, outputPath })
  });

  archive.finalize();
});

const getHashFromFile = (filename) => new Promise((resolve, reject) => {
  const hash = createHash('sha1')  
  const input = createReadStream(filename);

  input.on('readable', () => {
    const data = input.read();
    if (data) {
      hash.update(data);
    } else {
      const digestedHash = hash.digest('hex');
      resolve(digestedHash)
    }
  });
});

async function sendChatMessage(message) {
  try {
    await server.executeCommand(`say ${ message }`);
    console.log(`Successfully sent the following message in the ${ server.name } chat: "${ message }"`)
  } catch (error) {
    console.error(error.message);
  }
}

async function getServerByName(name) {
  let servers = await client.getServers();

  const server = servers.find(server => {
    return server.name == name
  })

  return server
}

init()

// * References

// General
// - https://www.reddit.com/r/HermitCraft/comments/1bam4k7/question_about_the_hermit_craft_season_10_server/

// Exaroton
// - https://developers.exaroton.com/
// - https://www.npmjs.com/package/exaroton
