const util = require('./util.js')

let file_a = util.read_file('./File A.csv');
let file_b = util.read_file('File B.csv')

let file_c = util.merge_files(file_a, file_b)

util.get_piano_users().then(
    piano_users => {
        let clean_file_c = util.compare_file_with_piano(file_c, piano_users);
        util.save_to_file(clean_file_c);
    }
);