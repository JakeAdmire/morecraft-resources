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
  const fileSize = await bundleTexturePack('texturePack')
  console.log(`A new texture pack has been bundled at ${ fileSize }`)

  // 2. Get current hash from server.properties / resource-pack-sha1

  // 3. Get new hash based on the updated texture pack archive
  const newHash = await getHashFromFile('texturePack.zip');
  console.log(`Generated the following hash to replace "texture-pack-sha1": "${ newHash }"`)

  // 4. Compare the new and old hashes
  
  // 5. Update server.properties
  //  a. resource-pack
  //  b. resource-pack-sha1

  // 6. Wait for the next restart? 
  // How do we force it to reload without restarting the server? 
}

// * Utilities

const bundleTexturePack = (directory = 'texturePack') => new Promise((resolve, reject) => {
  const output = createWriteStream(__dirname + '/texturePack.zip');
  const archive = archiver('zip');

  archive.directory(directory, false);
  archive.pipe(output);

  output.on('close', function () {
    const bytes = archive.pointer()
    const megabytes = Math.round((bytes / 1000000) * 10) / 10

    resolve(`${ megabytes }mb`)
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
