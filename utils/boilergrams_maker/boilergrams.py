import crossword_puzzle
import random


class Crossword:
    def __init__(self, number_of_words: int, max_grid_size: int, words_list: list[str], seed: int = None):
        """
        This is a class used for making crossword

        Note: The self.grid attribute is not populated as None by default and will not self populate.
        This is intentional as it as a resource heavy function and has been offloaded to the function : make_crossword
        This will set the value of self.grid, unless the value could not be generated (due to not enough spin attempts
        or an impossible word list) where the value will remain as None)

        :param number_of_words:
        :param max_grid_size:
        :param words_list:
        :param seed:
        """
        self.number_of_words = number_of_words
        self.max_grid_size = max_grid_size
        self.words_list = words_list
        self.rng = random.Random(seed)
        self.grid: crossword_puzzle.Grid | None = None

    def choose_random_words(self) -> list[str]:
        """
        This function takes a file, randomly selects lines from a list and returns the list of those lines
        :return: a list of words
        """
        rng = self.rng
        words = rng.choices(self.words_list, k=self.number_of_words)
        return words

    def valid_crossword(self, grid: crossword_puzzle.Grid) -> bool:
        """
        This code ensure that the crossword is valid to the needs of the frontend. It does this three separate ways
        1. ensuring that grid is not greater than max_dimensions
        2. makes sure that all words were successfully placed onto the crossword
        3. validates that a bug occurs with the crossword puzzle generator does not happen - this is an O(n) operation

        There is a bug where the crossword puzzles will incorrectly be generated under certain conditions
        this code checks to make sure that those incorrect creations do not happen
        """
        if grid is None:
            return False

        if max(grid.num_rows, grid.num_cols) > self.max_grid_size:
            return False

        if self.number_of_words != len(grid.grid_words):
            return False

        # TODO check if all grid words are in the word list

        # there is a weird bug where the crosswords.grid that will allow for word over and under runs.
        # this checks to see if there is that issue has occurred and returns False if that
        for word in grid.grid_words:
            a = str(word.direction) == "ACROSS" and word.c2 + 1 < grid.num_cols and grid.grid[word.r2][word.c2 + 1]
            b = str(word.direction) == "ACROSS" and word.c1 - 1 >= 0 and grid.grid[word.r1][word.c1 - 1]
            c = str(word.direction) == "DOWN" and word.r2 + 1 < grid.num_rows and grid.grid[word.r2 + 1][word.c2]
            d = str(word.direction) == "DOWN" and word.r1 - 1 >= 0 and grid.grid[word.r1 - 1][word.c1]
            if a or b or c or d:
                return False
        return True

    def make_crossword(self) -> bool:
        """
        Attempts 500 Spins to make the crossword
        :return: a bool of returns whether the grid was made or not
        """
        max_spin_attempts = 500

        spin = 0
        while spin < max_spin_attempts:
            words = self.choose_random_words()
            grid = crossword_puzzle.Grid(num_rows=20, num_cols=20, seed=0)
            grid.scan_and_insert_all_words(words)
            grid = grid.crop()

            if self.valid_crossword(grid):
                self.grid = grid
                break

            spin += 1

        return self.grid is not None


def choose_starting_letters(crossword: Crossword, random_number_generator: random.Random) -> list[list[bool]]:
    """
    This function given a crossword will decide which letters should be starting (and not starting) for the game.
    The return will be a 2d List with True and False values

    :param crossword:
    :param random_number_generator:
    :return:
    """
    grid = crossword.grid
    rng = random_number_generator

    starting_letters_locations = [[True for _ in range(grid.num_cols)] for _ in range(grid.num_rows)]
    for word in grid.grid_words:
        word_length = len(word.word)
        # a = minimum_number_of_letters_to_remove_from_word
        # b = maximum_number_of_letters_to_remove_from_word
        if word_length < 5:
            a = 1
            b = 1
        elif word_length == 5:
            a = 2
            b = 2
        elif word_length == 6:
            a = 2
            b = 3
        elif word_length == 7:
            a = 3
            b = 3
        else:  # word_length > 7:
            a = 3
            b = word_length // 2
        # a = 2
        # b = round(word_length / 2)
        number_of_letters_to_remove_from_word = rng.randint(a, b)

        index_of_letters_to_remove = rng.choices(list(range(word_length)), k=number_of_letters_to_remove_from_word)
        for i in index_of_letters_to_remove:
            if str(word.direction) == "ACROSS":
                starting_letters_locations[word.r1][word.c1 + i] = False
            else:
                starting_letters_locations[word.r1 + i][word.c1] = False

    return starting_letters_locations


def compress_game_data(crossword: Crossword, starting_letters: list[list[bool]]) -> str:
    """
    The format of the grid:

    ----S-F-
    BROCHURE
    ----A-U-
    --C-D-I-
    -HONEST-
    --M-----
    --I-----
    --CANADA

    Compresses to:

    4s1F1bROchuRe4A1U3c1d1i2Honest3m7I7cAnaDA

    A number represents the number of blank spaces until the next letter (left to right, top to bottom). The letters
    represent the letter at that location. If the letter is upper case then that letter is a starting letter. If that
    letter is lowercase then that letter needs to be added to the letter pool.

    In the event that the crossword is so big there are more than 9 blank spaces between the letters the sum of the
    numbers will be placed consecutively. For Example

    12 (blanks) -> 93  -  Since 9 + 3 = 12

    :param crossword:
    :param starting_letters:
    :return:
    """
    grid = crossword.grid

    # Yikes - lets break this code down (To any future employer this code looks bad but makes our database 82% more
    #         space efficient. And no this was not a premature optimization - this was seriously starting to become a
    #         problem and if we didn't fix it we were going to have to start paying money. College Student Moment)

    data = ""
    empty_slot_counter = 0
    for i in range(grid.num_rows):
        for j in range(grid.num_cols):
            if grid.grid[i][j]:
                if empty_slot_counter != 0:
                    data += str(empty_slot_counter)
                    empty_slot_counter = 0

                if starting_letters[i][j]:
                    data += grid.grid[i][j].upper()
                else:
                    data += grid.grid[i][j].lower()
            else:
                empty_slot_counter += 1
                if empty_slot_counter > 9:
                    data += "9"
                    empty_slot_counter -= 9

    if empty_slot_counter != 0:
        data += str(empty_slot_counter)

    return data


def main():
    from pathlib import Path
    import sys
    import json

    assert len(sys.argv) == 2 and sys.argv[1].isdigit(), "Must be called with a seed argument which must be an integer"

    number_of_words = 5
    max_grid_size = 8
    words_file = Path(__file__).resolve().parent / "words.txt"
    seed = int(sys.argv[1])

    with open(words_file) as file:
        words_list = file.read().splitlines()

    game = Crossword(number_of_words, max_grid_size, words_list, seed=seed)
    game.make_crossword()

    assert game.grid is not None, "Grid was unable to be generated"

    starting_letters = choose_starting_letters(game, game.rng)
    data = compress_game_data(game, starting_letters)

    contents = {
        "dimensions": [game.grid.num_rows, game.grid.num_cols],
        "data": data,
    }
    print(json.dumps(contents))


if __name__ == '__main__':
    main()
