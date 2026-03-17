//  in this file here we start the server

require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

(async () => {
  await connectDB();

  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
})();
