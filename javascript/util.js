const { BASE_API_URL, API_TOKEN, APPLICATION_ID } = require('./settings.js');
const Fs = require('fs');
const Papa = require('papaparse');
const request = require('request');
const { promisify } = require('util');
const ObjectsToCsv = require('objects-to-csv');


// Returns the content of a CSV file given its path
module.exports.read_file = function(path) {
    var data = Fs.readFileSync(path, 'utf8');

    let content = Papa.parse(data);

    let headers = content.data.shift();

    let rows = content.data;

    rows.sort(sortByUserId);

    return {
        'headers': headers,
        'rows': content.data
    }
}


// Assumes file_a and file_b contain the same number of rows, that they're sorted by user_id, and that the user_ids match
module.exports.merge_files = function(file_a, file_b) {
    let rows_a = file_a['rows']
    let rows_b = file_b['rows']
    
    let content = []
    for (let i = 0; i < rows_a.length; i++) {
        let row_a = rows_a[i]
        let row_b = rows_b[i]

        content.push({
            'user_id': row_a[0],
            'email': row_a[1],
            'first_name': row_b[1],
            'last_name': row_b[2]
        })
    }

    return content;
}

function sortByUserId(a, b) {
    if (a[0] === b[0]) {
        return 0;
    } else {
        return (a[0] < b[0]) ? -1 : 1;
    }
}


// Gets the entire user list from a specific Piano Application Id
// It takes into account the segmented nature of the response of the API
// which allows only batches of 100 users to be delivered per request
module.exports.get_piano_users = async function(application_id=APPLICATION_ID, max_failed_attempts=5) {
    let output = []
    let endpoint = 'publisher/user/list'
    let limit = 100
    let offset = 0
    let do_request = true
    const requestPromise = promisify(request);

    while (do_request) {
        console.log(`Executing request to Piano REST API at '${endpoint}'`)
        
        const response = await requestPromise({
            uri: BASE_API_URL + endpoint,
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'api_token': API_TOKEN
            },
            qs: {
                'aid': application_id,
                'limit': limit,
                'offset': offset
            }
        });
        
        // Piano returns the HTTP status code inside the json block
        // I had to implement this to check if the request is valid
        if (response.statusCode === 200) {
            var data = JSON.parse(response.body);
            var ok_response = data.code == 0
        } else {
            var ok_response = False
        }

        if (ok_response) {
            data.users.forEach(user => output.push(user));

            // This checks if the count of items retrieved is equal to the limit
            // of items per request, if it is then we want to do a new request
            // with the offset adjusted
            do_request = data.limit == data.count
            offset += limit

            console.log('Request successfull!')
        } else {
            max_failed_attempts -= 1
            if (max_failed_attempts <= 0)
                throw Error(`Request to Piano REST API at '${endpoint}' failed too many times`)

            console.log(`Request failed, remaining attempts: ${max_failed_attempts}`)
        }
    }

    return output
}


module.exports.compare_file_with_piano = function(content, users) {
    content.forEach(entry => {
        users.forEach(user => {
            if (entry.email.toLowerCase() === user.email.toLowerCase()) {
                entry.user_id = user.uid;
            }
        });
    });

    return content
}


module.exports.save_to_file = async function(content, filename='Merged.csv') {
    let csv = new ObjectsToCsv(content);
    await csv.toDisk(filename);
}
