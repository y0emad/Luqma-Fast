require('dotenv').config({ path: './.env' });

const { Server } = require('./Server');

let server = new Server().app;
let port = process.env.PORT;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});