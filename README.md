# Color Me Goodd

Pulls random album art from your Rdio collection and generates a tiled mosaic based on computed dominant
colors for each cell. It essentially, "pixelates" the album artwork.

Each cell in the resulting mosiac corresponds to an album in your collection. The mapping is
determined by the color of the cell and the dominant color of the album.

Cells are also given an elevation on the z-axis through drop shadows. The higher the play count of an album
(i.e. the more times you've listened to it), the higher the elevation. This provides an interesting method
for comparing album popularity in your collection.

Clicking on each cell will display the album and the dominant color of that album.

There are 3 overlays:

- Goodd: The computed mosiac with clickable cells
- Original: The unmodified album artwork
- Album composite: Displays a mosaic using the album artwork associated with each cell's color.

These overlays can be switched between through the buttons at the top of the page.

# Disclaimer and Notes

I am not a javascript programmer, this was a hackday project I put together over the course of a few hours.
The code is kind of crazy and not really organized.

This uses a modified version of ColorThief (https://github.com/lokesh/color-thief/) to compute dominant color.

I used Ian Gilman's Collection Random project as a starting point to bootstrap development
http://iangilman.com/rdio/collection-random/

