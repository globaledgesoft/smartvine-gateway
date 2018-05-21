module.exports = {
    client: 'pg',
    connection: {
        user: "iiot",
        password: "p@ssw0rd",
        host: "192.168.10.87",
        port: "5432",
        database: 'iiot',
        ssl: true
    },
    schemaname: "iiot",
    pool: {

    },
    queue: {
        host: '0.0.0.0',
        port: 5672
    },
    acquireConnectionTimeout: 10000,
    port: 8090,
    redis: {
        host: '0.0.0.0',
        port: 6379
    }
}
