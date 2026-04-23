const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const config = require('./env');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to your .env file.');
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({
    adapter,
    log:
        config.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
});

//connect to the database
async function connectDB() {
    try {
        await prisma.$connect();
        console.log('Connected to the database via prisma');
    } catch (error) {
        console.error(`Error connecting to the database: ${error.message}`);
        process.exit(1);
    }
};

//disconnect from the database
async function disconnectDB() {
    try {
        await prisma.$disconnect();
        console.log('Disconnected from the database via prisma');
    } catch (error) {
        console.error(`Error disconnecting from the database: ${error.message}`);
        process.exit(1);
    }
};

module.exports = { 
    prisma, 
    connectDB, 
    disconnectDB 
};