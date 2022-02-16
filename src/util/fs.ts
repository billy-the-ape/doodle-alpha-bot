import fs from 'fs';
import { nanoid } from 'nanoid';

const UID_LENGTH = 6;

export const generateCsv = (fileName: string, dataToWrite: string) =>
  new Promise<string>((resolve, reject) => {
    if (!fs.existsSync('./temp')) {
      fs.mkdirSync('./temp');
    }
    const fullFilePath = `./temp/${fileName}-${nanoid(UID_LENGTH)}.csv`;

    fs.writeFile(fullFilePath, dataToWrite, 'utf8', function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(fullFilePath);
      }
    });
  });
