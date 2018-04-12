const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const promisify = require('util').promisify;
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const config = require('../config/defaultConfig');
const mime = require("./mime");
const compress = require('./compress');
const range = require('./range');

const tplParh = path.join(__dirname,'../template/dir.tpl')
const source = fs.readFileSync(tplParh);
const template = Handlebars.compile(source.toString());

module.exports = async function (req, res, filePath) {
  try {
    const stats = await stat(filePath);
    if (stats.isFile()) {
      res.statusCode = 200;
      const contentType = mime(filePath);
      res.setHeader('content-Type', contentType);
      let rs;
      const {code,start,end} = range(stats.size,req,res);
      if(code===200){
        rs = fs.createReadStream(filePath);
      }else{
        rs = fs.createReadStream(filePath,{start,end});
      }
      if(filePath.match(config.compress)){
        rs = compress(rs,req,res);
      }
      rs.pipe(res);
    } else if (stats.isDirectory()) {
      const files = await readdir(filePath);
      res.statusCode = 200;
      res.setHeader('content-Type', 'text/html');
      const dir = path.relative(config.root, filePath);
      const data = {
        title:path.basename(filePath),
        dir: dir ? `/${dir}`:'',
        files
      }
      res.end(template(data));
    }
  } catch (ex) {
    console.log(ex);
    res.statusCode = 404;
    res.setHeader('content-Type', 'text/plain');
    res.end(`${filePath} is not a directory or file`);
  }
}
