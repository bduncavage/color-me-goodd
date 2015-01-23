/*globals rdioUtils, Main, R */

(function() {

  // ----------
  window.Main = {
    albums: [],

    // ----------
    init: function() {
      var self = this;

      this.currentAlbums = [];
      this.possibleAlbums = [];
      this.cellPosToAlbum = {};
      this.processingComplete = false;
      this.initialProcessingStarted = false;
      this.showOriginal = true;

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
          self.possibleAlbums = self.possibleAlbums.concat(albums);
          self.indicies = _.startProcessing(_.range(self.possibleAlbums.length));
          if (!self.currentAlbums.length && !self.initialProcessingStarted) {
            self.startProcessing();
          }
        }
      });

      $('.shuffle')
        .click(function() {
          self.startProcessing();
        });

      var image = $('#largeAlbum');
      image.fadeOut();
      $('.original').click(function() {
        if (self.showOriginal) {
          self.showOriginal = false;
          this.innerHTML = "Make Goodd";
          image.css('z-index', 100);
          image.fadeIn();
        } else {
          self.showOriginal = true;
          this.innerHTML = "Show Original";
          image.fadeOut();
        }

      });
    },

    // ----------
    startProcessing: function() {
      var self = this;
      self.initialProcessingStarted = true;

      var randomAlbumIndex = Math.floor( Math.random() * this.possibleAlbums.length);
      var randomAlbum = this.possibleAlbums[randomAlbumIndex];

      $('#largeAlbum').attr('src', randomAlbum.bigIcon);
      $('body').css('background', 'url("' + randomAlbum.backgroundImageUrl + '&w=1200") no-repeat center center fixed');
      $('body').css('background-size', 'cover');

      $('#largeAlbum').bind('load', function() {
       // var staticCanvas = document.createElement('staticCanvas');
        var staticCanvas = document.getElementById('staticCanvas');
        var drawingCanvas = document.getElementById('drawingCanvas');
       // $('.gridContainer').appendChild(staticCanvas);
        var staticContext = staticCanvas.getContext("2d");
        staticContext.drawImage(document.getElementById("largeAlbum"), 0, 0, 640, 640);
        self.drawingContext = drawingCanvas.getContext("2d");
        // Extract each cell from the image, draw it into a separate staticCanvas and analyze it.
        var extractedColors = [];
        var cf = new ColorThief();

        var gridSizeInPx = 640;
        var minBlockSize = 20;
        var blockSizeModifier = 16;
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
            var shadowFactor = 1;
            if (candidateAlbum.playCount < 300) {
              shadowFactor = candidateAlbum.playCount / 300;
            }
            self.drawingContext.shadowBlur = 45 * shadowFactor;
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
              currentRow++
            }
          }
          setTimeout(moveToNextBlock, 5);
        }
        setTimeout(moveToNextBlock, 2000);

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
