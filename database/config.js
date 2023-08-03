const mongoose = require("mongoose");

const dbConection = async () => {
    try {
        await mongoose.connect(process.env.db_cnn, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false,
        });
        // mongoose.set("useCreateIndex", true);
        // mongoose.set("useFindAndModify", false);
        console.log("Db online");
    } catch (error) {
        console.log(error);
        throw new Error("Error a la hora de inicializar base de datos");
    }
};

module.exports = {
    dbConection,
};
