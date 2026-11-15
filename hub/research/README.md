# 2050 Research

The research section of the front page, read like a preprint server from the year 2050. Eight papers, each a page of
this repo with its sources:

| № | Paper | Page | Its other form |
|---|---|---|---|
| 2050.001 | Book Projection 2050 | `books/dist/book-projection-2050.html` | the quote wall |
| 2050.002 | 2050 in 78 Tweets | `tweets/dist/tweets-2050.html` | the tweet wall |
| 2050.003 | Futurists on 2050 | `tweets/research/futurists-on-2050.html` | |
| 2050.004 | 2050 in Futurists’ Tweets | `tweets/research/2050-in-futurists-tweets.html` | the Russian copy |
| 2050.005 | Further 2050 | `video/dist/further-2050.html` | the film |
| 2050.006 | Projection 2050 | `reel/projection-2050.html` | |
| 2050.007 | Why Music Changes | `music/dist/why-music-changes.html` | History of Music 2050 |
| 2050.008 | Viral Webcam Effects | `mirror/viral-webcam-effects.html` | Mirror 2050 |

## What is where

- `papers.json`: the papers in order, each with its finding in one sentence (taken from its own page), its source
  trail, the number of specks around its star, its one other form and the papers it shares sources with. The numbers
  (2050.001 ...) follow the order. `papers.py` reads it and fills in the counts of tweets, authors and quotes.
- On the front page (`hub/template.html`, section `#research`): the **paper space**, a canvas where each paper is a
  chrome star and each of its sources a speck on an orbit tilted like the party's mark, with lines between papers that
  share sources; pointing at a star names it and lights its card, pointing at a card lights its star. Then one
  **paper card** each: the figure with its number, the field and source trail, the title, the finding, Read, and the
  paper's other form.
- On every paper's page (`vibes/restyle.py`, styles in `vibes/pages.css`): the chrome orbit of the front page's hero
  behind the title, and at the end the previous and the next paper with their figures, so the eight read as one
  series. The Russian copy takes the look without the English series.
- `figures.py` makes the figures, `<key>.jpg` at 1280x720: a 16:9 window inside the graphic on the paper's own page
  (the book spines, the five forces; the films' frame palettes stretched), a picture the repo already has (Further's
  poster, Mirror 2050's effects), or one drawn from the data (the authors' faces, the six findings).

## Changing it

```sh
# a paper's text, order or links: edit papers.json, then
python3 -I vibes/restyle.py          # the series at the end of every paper
python3 -I hub/build.py              # the front page
# a paper's page changed its look: make its figure again (Chrome, Pillow, the network for the fonts)
python3 -I hub/research/figures.py books why
```

A new paper needs its page in `PAGES` of `hub/build.py` (with the same key), in `vibes/restyle.py` `PAGES`, a title
and description in `hub/seo.py`, an entry in `papers.json` and a figure in `figures.py`.

## The references

The look comes from what people on X imagine the paper and arXiv becoming. Searched on 15 November 2026; every post
was checked through its public mirror.

| Idea | Where it is here | Posts |
|---|---|---|
| The paper as a place: papers as stars you fly between | the paper space | [soarXiv](https://x.com/jinaycodes/status/1924135806953787433) (@jinaycodes), [O-DataMap](https://x.com/Faheem_uh/status/2030932556363776320) (@Faheem_uh), [alphaXiv's map of 10,000 papers](https://x.com/askalphaxiv/status/2110387401445245292) |
| The paper as a feed card: a figure, the key idea | the paper cards, the figures | [alphaXiv Briefs](https://x.com/askalphaxiv/status/2090092007377277327), [visual overviews](https://x.com/askalphaxiv/status/2115131377641509259) |
| One paper, many forms: a video, a poster, a scroll | each card's other form (a wall, the film, an app) | [Paper2Video](https://x.com/ChrisLaubAI/status/1993969771784921384), [Paper2Poster](https://x.com/_akhaliq/status/1927721150584390129), [arXivisual](https://x.com/hasantoxr/status/2097398574061670664), [ResearchStudio-Reel](https://x.com/Xudong07452910/status/2082307375047041053) |
| A source trail on every claim | the source trail on each card, the specks | [paper2code](https://x.com/prathamgrv/status/2040057475542696309) (@prathamgrv), [Semantic Reader](https://x.com/josephcc/status/1719734716675604796) (@josephcc) |
| Explorable reading, one paper leading to the next | the series at the end of every paper | [Distill](https://x.com/distillpub/status/849294568981905408), [World Models](https://x.com/hardmaru/status/978794349101137920) (@hardmaru), [the Paper of the Future prize](https://x.com/AlexKontorovich/status/2049858865651437860) |
| The paper as an agent | not used: the site has no model behind it | [Paper2Agent](https://x.com/james_y_zou/status/2100257219384332333) (@james_y_zou), [alphaXiv on Stanford AI Lab](https://x.com/StanfordAILab/status/1818669016325800216) |
