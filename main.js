/*globals rdioUtils, Main, R */

(function() {

  // ----------
  window.Main = {
    albums: [],

    // ----------
    init: function() {
      var self = this;

      this.possibleAlbums = [];
      this.cellPosToAlbum = {};
      this.processingComplete = false;
      this.initialProcessingStarted = false;
      this.colorThief = new ColorThief();
      this.playCountRange = [];

      this.largeAlbum = $('#largeAlbum');

      if (!rdioUtils.startupChecks()) {
        return;
      }

      rdioUtils.authWidget($('.auth'));

      R.on('change:authenticated', function(authenticated) {
        $('.authenticated, .shuffle').toggle(authenticated);
        $('.unauthenticated').toggle(!authenticated);
      });

      this.collection = rdioUtils.collectionAlbums({
        localStorage: true,
        onAlbumsLoaded: function(albums) {
          var tmpImage = new Image();
          var curMin = -1;
          var curMax = -1;
          tmpImage.crossOrigin = 'anonymous';
          for (var i in albums) {
            var a = albums[i];
            if (a.playCount < curMin || curMin == -1) {
              curMin = a.playCount;
            } else if (a.playCount > curMax || curMax == -1) {
              curMax = a.playCount;
            }
          }
          if (self.playCountRange.length < 2) {
            self.playCountRange.push(curMin);
            self.playCountRange.push(curMax);
          } else {
            if (curMin < self.playCountRange[0]) {
              self.playCounRange[0] = curMin;
            }
            if (curMax > self.playCountRange[1]) {
              self.playCountRange[1] = curMax;
            }
          }
          self.possibleAlbums = self.possibleAlbums.concat(albums);
          if (self.possibleAlbums.length > 100 && !self.initialProcessingStarted) {
                self.startProcessing();
          }
        }
      });

      self.largeAlbum.hide();

      var _showGood = function() {
        $('#drawingCanvas').fadeIn();
        $('#albumsCanvas').fadeOut();
      }

      $('.shuffle').click(function() {
          $('#staticCanvas').hide();
          $('#destinationAlbumColor').css('background-color', 'transparent');
          $('#destinationAlbumIcon').attr('src', null);
          _showGood();
          for (var i = 0; i < self.possibleAlbums.length; i++) {
            var rand = Math.floor(Math.random() * self.possibleAlbums.length);
            var tmp = self.possibleAlbums[i];
            self.possibleAlbums[i] = self.possibleAlbums[rand];
            self.possibleAlbums[rand] = tmp;
          }
          self.startProcessing();
        });

      $('.original').click(function() {
        $('#staticCanvas').fadeIn();
        $('#drawingCanvas').fadeOut();
        $('#albumsCanvas').fadeOut();
      });

      $('#showGoodd').click(function() {
        _showGood();
      });
    },

    // ----------
    startProcessing: function() {
      var self = this;
      self.initialProcessingStarted = true;

      var randomAlbumIndex = Math.floor( Math.random() * this.possibleAlbums.length);
      var randomAlbum = this.possibleAlbums[randomAlbumIndex];

      self.largeAlbum.attr('src', randomAlbum.bigIcon);
      $('body').css('background', 'url("' + randomAlbum.backgroundImageUrl + '&w=1200") no-repeat center center fixed');
      $('body').css('background-size', 'cover');

      $('#largeAlbum').bind('load', function() {
        var staticCanvas = document.getElementById('staticCanvas');
        var drawingCanvas = document.getElementById('drawingCanvas');
        var albumsCanvas = document.getElementById('albumsCanvas');
        var albumsContext = albumsCanvas.getContext("2d");
        var staticContext = staticCanvas.getContext("2d");
        staticContext.drawImage(document.getElementById("largeAlbum"), 0, 0, 600, 600);
        self.drawingContext = drawingCanvas.getContext("2d");
        // Extract each cell from the image, draw it into a separate staticCanvas and analyze it.
        var extractedColors = [];
        var cf = self.colorThief;

        var gridSizeInPx = 600;
        var minBlockSize = 30;
        var blockSizeModifier = 10;
        var blockSize = gridSizeInPx / blockSizeModifier;
        var gridSize = gridSizeInPx / blockSize;

        function processBlock(col, row, computeAlbums) {
          var blockData = staticContext.getImageData(col * blockSize, row * blockSize, blockSize, blockSize);
          // Analyze the block data to get a color.
          var color = cf.getColorFromImageData(blockData);
          extractedColors.push(color);

          if (computeAlbums) {
            // try to find the album for this color
            var currentDistance = -1;
            var candidateAlbum;
            for (var i = 0; i < self.possibleAlbums.length; i++) {
              var color1 = self.possibleAlbums[i].dominantColor;
              var color2 = color;

              var dist = Math.sqrt(Math.pow(color1.r - color2[0],2) + Math.pow(color1.g - color2[1],2) + Math.pow(color1.b - color2[2],2));
              if (dist < currentDistance || currentDistance == -1) {
                candidateAlbum = self.possibleAlbums[i];
                currentDistance = dist;
              }
            }
            self.cellPosToAlbum[""+col+row] = candidateAlbum;
            var shadowFactor = (candidateAlbum.playCount - self.playCountRange[0]) / (self.playCountRange[1] - self.playCountRange[0]);
            self.drawingContext.shadowBlur = 20 * shadowFactor;
            self.drawingContext.shadowColor = "#111";
          } else {
            self.drawingContext.shadowBlur = 0;
          }

          self.drawingContext.fillStyle = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
          self.drawingContext.fillRect(col * blockSize, row * blockSize, blockSize, blockSize);
        }

        var currentRow = 0;
        var currentCol = 0;
        var computeAlbums = false;

        function moveToNextBlock() {
          if (currentRow >= gridSize) {
            if (blockSize > minBlockSize ) {
              // reduce block size
              blockSizeModifier *= 2;
              blockSize = gridSizeInPx / blockSizeModifier;
              gridSize = gridSizeInPx / blockSize;
              currentCol = 0;
              currentRow = 0;
              computeAlbums = blockSize <= minBlockSize;
              moveToNextBlock();
            } else {
              computeAlbums = false;
              self.processingComplete = true;
              return;
            }
          }
          if (currentCol < gridSize) {
            processBlock(currentCol, currentRow, computeAlbums);
            currentCol++;
            if (currentCol >= gridSize) {
              currentCol = 0;
              currentRow++;
            }
          }
          setTimeout(moveToNextBlock, 5);
        }
        moveToNextBlock();

        $('#drawingCanvas').click(function(e) {
          if (!self.processingComplete) {
            return;
          }
          var pos = findPos(this);
          var x = e.pageX - pos.x;
          var y = e.pageY - pos.y;

          var col = Math.floor(x / blockSize);
          var row = Math.floor(y / blockSize);
          var key = ""+col+row;
          var album = self.cellPosToAlbum[key];

          var ac = album.dominantColor;
          $('#destinationAlbumColor').css('background-color', 'rgb('+ac.r+','+ac.g+','+ac.b+')');
          $('#destinationAlbumIcon').attr('src', album.icon);
        });

        $('#showAlbums').click(function() {
          var curCol = 0;
          var curRow = 0;
          var tmpImage = new Image();
          $('#drawingCanvas').fadeOut();
          $('#albumsCanvas').fadeIn();
          tmpImage.onload = function() {
            albumsContext.drawImage(tmpImage, curCol * blockSize, curRow * blockSize, blockSize, blockSize);
            curCol++;
            if (curCol >= gridSize) {
              curCol = 0;
              curRow++;
            }
            if (curRow < gridSize) {
              var album = self.cellPosToAlbum[""+curCol+curRow];
              if (tmpImage.src === album.icon) {
                tmpImage.onload();
              } else {
                tmpImage.src = album.icon;
              }
            }
          }
          var album = self.cellPosToAlbum[""+curCol+curRow];
          tmpImage.src = album.icon;
        });
      });

      function findPos(obj) {
        var curleft = 0, curtop = 0;
        if (obj.offsetParent) {
          do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
          } while (obj = obj.offsetParent);
          return { x: curleft, y: curtop };
        }
        return undefined;
      }
    },

    // ----------
    template: function(name, config) {
      var rawTemplate = $.trim($("#" + name + "-template").text());
      var template = _.template(rawTemplate);
      var html = template(config);
      return $(html);
    }
  };

  // ----------
  $(document).ready(function() {
    Main.init();
  });

})();
