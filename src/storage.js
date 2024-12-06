import {Dropbox} from 'dropbox';
import dotenv from 'dotenv';

dotenv.config();
const dbx = new Dropbox({ accessToken: process.env.DBX_ACCESS_TOKEN });

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
