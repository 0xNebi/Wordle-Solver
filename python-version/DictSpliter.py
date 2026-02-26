import os
from pathlib import Path

BASE_DIR = Path(__file__).parent


def split_words_by_length(input_file: str, output_directory: str) -> None:
    os.makedirs(output_directory, exist_ok=True)

    word_groups: dict[int, list[str]] = {}

    with open(input_file, 'r', encoding='utf-8', errors='ignore') as file:
        for line in file:
            word = line.strip()
            if word:
                word_length = len(word)
                if word_length not in word_groups:
                    word_groups[word_length] = []
                word_groups[word_length].append(word)

    for length, words in sorted(word_groups.items()):
        output_file = os.path.join(output_directory, f"{length}_letter_words.txt")
        with open(output_file, 'w', encoding='utf-8') as file:
            file.write("\n".join(words))

    total_words = sum(len(w) for w in word_groups.values())
    print(f"\nDone! Split {total_words} words into {len(word_groups)} group(s).")
    print(f"Output saved to: {output_directory}")


def main() -> None:
    print("=" * 50)
    print("  Word List Splitter — for Wordle Solver")
    print("=" * 50)
    print("This tool splits a word list file into separate")
    print("files grouped by word length (e.g. 5_letter_words.txt).")
    print()

    default_input = str(BASE_DIR / "words.txt")
    user_input = input(f"Path to input word list file\n  [default: {default_input}]: ").strip()
    input_file = user_input if user_input else default_input

    if not Path(input_file).exists():
        print(f"\nERROR: File not found: {input_file}")
        print("Make sure the file exists and the path is correct.")
        return

    default_output = str(BASE_DIR / "src" / "word_groups")
    user_output = input(f"\nPath to output directory\n  [default: {default_output}]: ").strip()
    output_directory = user_output if user_output else default_output

    print(f"\nReading words from: {input_file}")
    print(f"Saving groups to:   {output_directory}")

    split_words_by_length(input_file, output_directory)


if __name__ == "__main__":
    main()
