from util import *

file_a = read_file('File A.csv')
file_b = read_file('File B.csv')

file_c = merge_files(file_a, file_b)

piano_users = get_piano_users()

clean_file_c = compare_file_with_piano(file_c, piano_users)

save_to_file(clean_file_c)