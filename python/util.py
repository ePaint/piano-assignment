import csv
import requests
import settings as s


# Returns the content of a CSV file given its path
def read_file(path):
    file = open(path)
    csvreader = csv.reader(file)
    header = []
    header = next(csvreader)

    rows = []
    for row in csvreader:
        rows.append(row)
    
    sorted_rows = sorted(rows, key=lambda row: row[0], reverse=False)

    return {
        'header': header,
        'rows': sorted_rows
    }


# Assumes file_a and file_b contain the same number of rows, that they're sorted by user_id, and that the user_ids match
def merge_files(file_a, file_b):
    rows_a = file_a['rows']
    rows_b = file_b['rows']
    
    headers = ['user_id', 'email', 'first_name', 'last_name']
    rows = []
    for i in range(0, len(rows_a)):
        row_a = rows_a[i]
        row_b = rows_b[i]

        rows.append([row_a[0], row_a[1], row_b[1], row_b[2]])
    
    sorted_rows = sorted(rows, key=lambda row: row[0], reverse=False)

    return {
        'headers': headers,
        'rows': sorted_rows
    }


# Gets the entire user list from a specific Piano Application Id
# It takes into account the segmented nature of the response of the API
# which allows only batches of 100 users to be delivered per request
def get_piano_users(application_id=s.APPLICATION_ID, max_failed_attempts=5):
    output = []
    endpoint = 'publisher/user/list'
    limit = 100
    offset = 0
    do_request = True

    while do_request:
        print(f'Executing request to Piano REST API at \'{endpoint}\'')

        response = requests.get(
            url = s.BASE_API_URL + endpoint,
            headers = {
                'content-type': 'application/x-www-form-urlencoded',
                'api_token': s.API_TOKEN
            },
            params = {
                'aid': application_id,
                'limit': limit,
                'offset': offset
            }
        )
        
        # Piano returns the HTTP status code inside the json block
        # I had to implement this to check if the request is valid
        # or not instead of just using 'response.ok' like I normally would
        if response.ok:
            data = response.json()
            ok_response = data['code'] == 0
        else:
            ok_response = False

        if ok_response:
            for user in data['users']:
                output.append(user)

            # This checks if the count of items retrieved is equal to the limit
            # of items per request, if it is then we want to do a new request
            # with the offset adjusted
            do_request = data['limit'] == data['count']
            offset += limit

            print('Request successfull!')
        else:
            max_failed_attempts -= 1
            if max_failed_attempts <= 0:
                raise Exception(f'Request to Piano REST API at \'{endpoint}\' failed too many times')

            print(f'Request failed, remaining attempts: {max_failed_attempts}')
    
    return output


def compare_file_with_piano(file, users):
    for row in file['rows']:
        email = row[1]

        for user in users:
            if email.casefold() == user['email'].casefold():
                row[0] = user['uid']
    return file


def save_to_file(content, filename='Merged.csv'):
    file = open(filename, 'w', newline='')

    writer = csv.writer(file)

    writer.writerow(content['headers'])

    for row in content['rows']:
        writer.writerow(row)
    
    file.close()
