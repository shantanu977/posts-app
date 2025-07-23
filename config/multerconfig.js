const multer = require("multer");
const path = require("path");

// disk storage

const storage=multer.diskStorage({
    destination : function(req,file,cb){
        cb(null, path.join(__dirname, "../public/images/uploads"));

    },
    filename : function(req,file,cb){
        cb(null,Date.now()+path.extname(file.originalname));
    }
})

const upload = multer({storage : storage});

//export
module.exports = upload;