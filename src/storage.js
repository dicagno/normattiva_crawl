import {Dropbox} from 'dropbox';
import 'dotenv/config';

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_OAUTH2_TOKEN });

export async function uploadContentToDropbox(fileContent, dropboxPath) {
    try {
      // Upload the file to Dropbox (set mode to 'overwrite')
      const response = await dbx.filesUpload({
        path: dropboxPath,
        contents: fileContent,
        mode: { '.tag': 'overwrite' }
      });
  
      console.log('File uploaded successfully:', response.result.path_display);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }


  export async function getJsonFileContents(filePath) {
    try {
      // Download the file
      const response = await dbx.filesDownload({ path: filePath });
  
      // The file contents are in response.result.fileBinary as a Buffer
      const fileContents = response.result.fileBinary.toString('utf8');
  
      // Parse the JSON
      const jsonData = JSON.parse(fileContents);
  
      return jsonData;
    } catch (error) {
      console.error('Error fetching JSON file:', error);
    }
  }

  export async function listFilesInDirectory(folderPath) {
    try {
      // List files in the specified folder
      const response = await dbx.filesListFolder({ path: folderPath });
  
      // Log the file entries
      response.result.entries.forEach((entry) => {
        console.log(`${entry['.tag']}: ${entry.name}`);
      });
  
      return response.result.entries; // Return the list of file entries
    } catch (error) {
      console.error('Error listing files in directory:', error);
    }
  }