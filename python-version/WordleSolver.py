import os
import random
import tkinter as tk
from tkinter import messagebox
from pathlib import Path

BASE_DIR = Path(__file__).parent

def load_words(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return [w.strip() for w in f if w.strip()]

def filter_words(length, excluded_letters, included_letters, green_letters, yellow_constraints):
    file_path = BASE_DIR / 'src' / 'word_groups' / f'{length}_letter_words.txt'
    if not file_path.exists():
        messagebox.showerror("Error", f"No file found for words of length {length}")
        return []
    words = load_words(file_path)
    excl = {ch.upper() for ch in excluded_letters.replace(',', '').strip()}
    incl = {ch.upper() for ch in included_letters.replace(',', '').strip()}
    w_filtered = [w for w in words if not (set(w.upper()) & excl)]
    w_filtered = [w for w in w_filtered if incl.issubset(set(w.upper()))]   
    for pos, ch in enumerate(green_letters):
        if ch:
            w_filtered = [w for w in w_filtered if w[pos].upper() == ch.upper()]
    all_yellow = []
    for pos, letters in enumerate(yellow_constraints):
        letters = [ch.upper() for ch in letters if ch.strip()]
        if letters:
            w_filtered = [w for w in w_filtered if w[pos].upper() not in letters]
            all_yellow += letters
    for ch in set(all_yellow):
        w_filtered = [w for w in w_filtered if ch in w.upper()]
    return w_filtered

def get_best_suggestion(word_list):
    max_unique = max(len(set(w.upper())) for w in word_list)
    candidates = [w for w in word_list if len(set(w.upper())) == max_unique]
    return random.choice(candidates)

root = tk.Tk()
root.title("Wordle Solver")
root.resizable(False, False)
PADX, PADY = 5, 5
length_var = tk.IntVar(value=5)
green_entries = []
yellow_entries = []

def rebuild_letter_slots(*args):
    n = length_var.get()
    for w in green_frame.winfo_children(): w.destroy()
    for w in yellow_frame.winfo_children(): w.destroy()
    green_entries.clear(); yellow_entries.clear()
    for i in range(n):
        e = tk.Entry(green_frame, width=2, justify='center')
        e.grid(row=0, column=i, padx=2, pady=2)
        green_entries.append(e)
    for i in range(n):
        e = tk.Entry(yellow_frame, width=2, justify='center')
        e.grid(row=0, column=i, padx=2, pady=2)
        yellow_entries.append(e)

def reset_all():
    length_var.set(5)
    entry_excl.delete(0, tk.END)
    entry_incl.delete(0, tk.END)
    rebuild_letter_slots()
    lbl_count.config(text="")
    lbl_suggest.config(text="")
    txt_words.delete(1.0, tk.END)

def do_filter():
    try:
        n = length_var.get()
        excl = entry_excl.get()
        incl = entry_incl.get()
        greens = [e.get().strip() for e in green_entries]
        yellows = [list(e.get().strip()) for e in yellow_entries]
        words = filter_words(n, excl, incl, greens, yellows)
        lbl_count.config(text=f"Words: {len(words)}")
        txt_words.delete(1.0, tk.END)
        for w in words:
            txt_words.insert(tk.END, w + "\n")
        lbl_suggest.config(text="")
    except Exception as e:
        messagebox.showerror("Error", str(e))

def do_suggest():
    try:
        n = length_var.get()
        excl = entry_excl.get()
        incl = entry_incl.get()
        greens = [e.get().strip() for e in green_entries]
        yellows = [list(e.get().strip()) for e in yellow_entries]
        words = filter_words(n, excl, incl, greens, yellows)
        if not words:
            messagebox.showinfo("No results", "No words matching the criteria.")
            return
        best = get_best_suggestion(words)
        lbl_suggest.config(text=f"Suggestion: {best}")
    except Exception as e:
        messagebox.showerror("Error", str(e))

tk.Label(root, text="How many letters in the target word?").grid(row=0, column=0, sticky='e', padx=PADX, pady=PADY)
sb = tk.Spinbox(root, from_=2, to=15, textvariable=length_var, width=5)
sb.grid(row=0, column=1, sticky='w', padx=PADX, pady=PADY)
length_var.trace_add('write', rebuild_letter_slots)
tk.Label(root, text="- EXCLUDED letters (e.g. a,b,c):").grid(row=1, column=0, sticky='e', padx=PADX, pady=PADY)
entry_excl = tk.Entry(root, width=20)
entry_excl.grid(row=1, column=1, sticky='w', padx=PADX, pady=PADY)
tk.Label(root, text="+ REQUIRED letters (e.g. d,e):").grid(row=2, column=0, sticky='e', padx=PADX, pady=PADY)
entry_incl = tk.Entry(root, width=20)
entry_incl.grid(row=2, column=1, sticky='w', padx=PADX, pady=PADY)
tk.Label(root, text="Green letters (exact position):").grid(row=3, column=0, columnspan=2, sticky='w', padx=PADX, pady=PADY)
green_frame = tk.Frame(root)
green_frame.grid(row=4, column=0, columnspan=2)
tk.Label(root, text="Yellow letters (not at this position):").grid(row=5, column=0, columnspan=2, sticky='w', padx=PADX, pady=PADY)
yellow_frame = tk.Frame(root)
yellow_frame.grid(row=6, column=0, columnspan=2)
btn_frame = tk.Frame(root)
btn_frame.grid(row=7, column=0, columnspan=2, pady=(10,0))
tk.Button(btn_frame, text="Filter", width=10, command=do_filter).grid(row=0,column=0, padx=5)
tk.Button(btn_frame, text="Suggest", width=10, command=do_suggest).grid(row=0,column=1, padx=5)
tk.Button(btn_frame, text="Reset", width=10, command=reset_all).grid(row=0,column=2, padx=5)
lbl_count = tk.Label(root, text="", font=('Arial',10,'bold'))
lbl_count.grid(row=8, column=0, columnspan=2, sticky='w', padx=PADX, pady=(10,0))
lbl_suggest = tk.Label(root, text="", font=('Arial',12))
lbl_suggest.grid(row=9, column=0, columnspan=2, sticky='w', padx=PADX)
txt_words = tk.Text(root, height=10, width=40)
txt_words.grid(row=10, column=0, columnspan=2, padx=PADX, pady=(5,10))
rebuild_letter_slots()
root.mainloop()
