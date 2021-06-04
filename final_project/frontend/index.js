const { Client } = require('@elastic/elasticsearch')
const config = require('config');
const elasticConfig = config.get('elastic');

const client = new Client({
    cloud: {
        id: elasticConfig.cloudID
    },
    auth: {
        username: elasticConfig.username,
        password: elasticConfig.password
    },
    node: 'http://localhost:9200'
})

// const client = new Client({
//     node: 'http://localhost:9200'
// })

// client.info()
//     .then(response => console.log(response))
//     .catch(error => console.error(error))

async function run() {
    await client.indices.create({
        index: 'tweets',
        body: {
            mappings: {
                properties: {
                    id: { type: 'integer' },
                    text: { type: 'text' },
                    user: { type: 'keyword' },
                    time: { type: 'date' }
                }
            }
        }
    }, { ignore: [400] })

    const dataset = [{
        id: 1,
        text: 'If I fall, don\'t bring me back.',
        user: 'jon',
        date: new Date()
    }, {
        id: 2,
        text: 'Winter is coming',
        user: 'ned',
        date: new Date()
    }, {
        id: 3,
        text: 'A Lannister always pays his debts.',
        user: 'tyrion',
        date: new Date()
    }, {
        id: 4,
        text: 'I am the blood of the dragon.',
        user: 'daenerys',
        date: new Date()
    }, {
        id: 5, // change this value to a string to see the bulk response with errors
        text: 'A girl is Arya Stark of Winterfell. And I\'m going home.',
        user: 'arya',
        date: new Date()
    }]
    const body = dataset.flatMap(doc => [{ index: { _index: 'tweets' } }, doc])

    const { body: bulkResponse } = await client.bulk({ refresh: true, body })

    if (bulkResponse.errors) {
        const erroredDocuments = []
            // The items array has the same order of the dataset we just indexed.
            // The presence of the `error` key indicates that the operation
            // that we did for the document has failed.
        bulkResponse.items.forEach((action, i) => {
            const operation = Object.keys(action)[0]
            if (action[operation].error) {
                erroredDocuments.push({
                    // If the status is 429 it means that you can retry the document,
                    // otherwise it's very likely a mapping error, and you should
                    // fix the document before to try it again.
                    status: action[operation].status,
                    error: action[operation].error,
                    operation: body[i * 2],
                    document: body[i * 2 + 1]
                })
            }
        })
        console.log(erroredDocuments)
    }

    const { body: count } = await client.count({ index: 'tweets' })
    console.log(count)
}

run().catch(console.log)

async function read() {
    const { body } = await client.search({
        index: 'tweets',
        body: {
            query: {
                match: { text: 'dragon' }
            }
        }
    })
    console.log(body.hits.hits)
}

read().catch(console.log)