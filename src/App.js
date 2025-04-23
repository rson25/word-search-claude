import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Chip, 
  Grid, 
  useMediaQuery, 
  ThemeProvider, 
  createTheme, 
  Button,
  CssBaseline,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { useSpring, animated } from 'react-spring';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// List of words to hide in the puzzle
const possibleWords = [
  'REACT', 'MATERIAL', 'JAVASCRIPT', 'COMPONENT', 'HOOK', 'STATE', 'FUNCTION',
  'INTERFACE', 'RESPONSIVE', 'DESIGN', 'APPLICATION', 'DEVELOPMENT', 'PUZZLE',
  'SEARCH', 'GRID', 'ANIMATION', 'PERFORMANCE', 'STYLE', 'ELEMENT', 'THEME'
];

// Directions for word placement
const directions = [
  { dx: 1, dy: 0 },   // right
  { dx: -1, dy: 0 },  // left
  { dx: 0, dy: 1 },   // down
  { dx: 0, dy: -1 },  // up
  { dx: 1, dy: 1 },   // down-right
  { dx: -1, dy: 1 },  // down-left
  { dx: 1, dy: -1 },  // up-right
  { dx: -1, dy: -1 }, // up-left
];

function App() {
  const [grid, setGrid] = useState([]);
  const [hiddenWords, setHiddenWords] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [congratsOpen, setCongratsOpen] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const gridSize = 12;

  // Initialize the grid and place words
  const initializeGrid = useCallback(() => {
    // Create empty grid
    const newGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(''));
    
    // Select random words to hide
    const shuffled = [...possibleWords].sort(() => 0.5 - Math.random());
    const wordsToPlace = shuffled.slice(0, 10); // Use 10 words
    const placed = [];

    // Try to place each word
    wordsToPlace.forEach(word => {
      let attempts = 0;
      let isPlaced = false;

      while (attempts < 100 && !isPlaced) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const startX = Math.floor(Math.random() * gridSize);
        const startY = Math.floor(Math.random() * gridSize);

        // Check if word can fit
        if (canPlaceWord(newGrid, word, startX, startY, direction)) {
          placeWord(newGrid, word, startX, startY, direction);
          placed.push({
            word,
            start: { x: startX, y: startY },
            direction,
            coordinates: getWordCoordinates(word, startX, startY, direction)
          });
          isPlaced = true;
        }
        
        attempts++;
      }
    });

    // Fill remaining cells with random letters
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!newGrid[y][x]) {
          newGrid[y][x] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }

    setGrid(newGrid);
    setHiddenWords(placed);
    setFoundWords([]);
    setSelectedCells([]);
  }, [gridSize]);

  // Check if word can be placed without overlapping incorrectly
  const canPlaceWord = (grid, word, startX, startY, direction) => {
    const { dx, dy } = direction;
    
    for (let i = 0; i < word.length; i++) {
      const x = startX + i * dx;
      const y = startY + i * dy;
      
      // Check if position is out of bounds
      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
        return false;
      }
      
      // Check if cell is already filled with a different letter
      if (grid[y][x] && grid[y][x] !== word[i]) {
        return false;
      }
    }
    
    return true;
  };

  // Place word on the grid
  const placeWord = (grid, word, startX, startY, direction) => {
    const { dx, dy } = direction;
    
    for (let i = 0; i < word.length; i++) {
      const x = startX + i * dx;
      const y = startY + i * dy;
      grid[y][x] = word[i];
    }
  };

  // Get coordinates for each letter in a word
  const getWordCoordinates = (word, startX, startY, direction) => {
    const { dx, dy } = direction;
    const coordinates = [];
    
    for (let i = 0; i < word.length; i++) {
      coordinates.push({ x: startX + i * dx, y: startY + i * dy });
    }
    
    return coordinates;
  };

  // Handle cell selection
  const handleCellClick = (x, y) => {
    // Toggle selection of the cell
    const index = selectedCells.findIndex(cell => cell.x === x && cell.y === y);
    
    if (index > -1) {
      // Deselect cells after this one
      setSelectedCells(selectedCells.slice(0, index));
    } else {
      // Add this cell
      setSelectedCells([...selectedCells, { x, y }]);
    }
  };

  // Check if selected cells form a word
  useEffect(() => {
    if (selectedCells.length < 2) return;
    
    // Get the word from selected cells
    const word = selectedCells.map(cell => grid[cell.y][cell.x]).join('');
    
    // Look for the word in hidden words
    const foundWord = hiddenWords.find(hw => {
      // Check if coordinates match exactly
      if (hw.coordinates.length !== selectedCells.length) return false;
      
      // Check each coordinate
      return hw.coordinates.every((coord, i) => 
        coord.x === selectedCells[i].x && 
        coord.y === selectedCells[i].y
      );
    });
    
    if (foundWord && !foundWords.includes(foundWord.word)) {
      // Word found!
      setFoundWords([...foundWords, foundWord.word]);
      setNotification({
        open: true,
        message: `You found ${foundWord.word}!`,
        severity: 'success'
      });
      
      // Clear selection after a brief delay
      setTimeout(() => {
        setSelectedCells([]);
      }, 1000);
    }
  }, [selectedCells, grid, hiddenWords, foundWords]);

  // Check if all words are found
  useEffect(() => {
    if (hiddenWords.length > 0 && foundWords.length === hiddenWords.length) {
      setCongratsOpen(true);
    }
  }, [foundWords, hiddenWords]);

  // Initialize game on load
  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  // Animation for found words
  const foundAnimation = useSpring({
    from: { opacity: 0, transform: 'scale(0.8)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: { tension: 300, friction: 10 }
  });

  // Check if a cell is part of a found word
  const isPartOfFoundWord = (x, y) => {
    return hiddenWords.some(hw => 
      foundWords.includes(hw.word) && 
      hw.coordinates.some(coord => coord.x === x && coord.y === y)
    );
  };

  // Check if a cell is currently selected
  const isCellSelected = (x, y) => {
    return selectedCells.some(cell => cell.x === x && cell.y === y);
  };

  // Get the color for a cell
  const getCellColor = (x, y) => {
    if (isPartOfFoundWord(x, y)) {
      return theme.palette.success.light;
    }
    if (isCellSelected(x, y)) {
      return theme.palette.primary.light;
    }
    return theme.palette.background.paper;
  };

  // Helper to close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ pt: 4, pb: 8 }}>
        <Typography variant="h3" component="h1" align="center" gutterBottom>
          Word Search Puzzle
        </Typography>
        
        <Typography variant="body1" align="center" sx={{ mb: 4 }}>
          Find all {hiddenWords.length} hidden words by selecting letters in sequence.
        </Typography>
        
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            mb: 4, 
            overflowX: 'auto',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <Box sx={{ display: 'inline-block' }}>
            <Grid container spacing={isMobile ? 0.5 : 1} sx={{ width: 'auto' }}>
              {grid.map((row, y) => (
                <Grid container item key={y} spacing={isMobile ? 0.5 : 1}>
                  {row.map((cell, x) => (
                    <Grid item key={`${x}-${y}`}>
                      <Paper
                        elevation={1}
                        onClick={() => handleCellClick(x, y)}
                        sx={{
                          width: isMobile ? 24 : 36,
                          height: isMobile ? 24 : 36,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          backgroundColor: getCellColor(x, y),
                          color: isPartOfFoundWord(x, y) || isCellSelected(x, y) ? 'white' : 'inherit',
                          transition: 'background-color 0.3s, transform 0.2s',
                          '&:hover': {
                            backgroundColor: isPartOfFoundWord(x, y) 
                              ? theme.palette.success.main 
                              : theme.palette.primary.light,
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        {cell}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Found Words: {foundWords.length}/{hiddenWords.length}
          </Typography>
          <Paper elevation={1} sx={{ p: 2, minHeight: 60 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {foundWords.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No words found yet. Keep searching!
                </Typography>
              ) : (
                foundWords.map((word, index) => (
                  <animated.div key={word} style={foundAnimation}>
                    <Chip 
                      label={word} 
                      color="primary" 
                      sx={{ fontWeight: 'bold' }}
                    />
                  </animated.div>
                ))
              )}
            </Box>
          </Paper>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={initializeGrid}
            sx={{ px: 4 }}
          >
            New Game
          </Button>
        </Box>
        
        {/* Success notification */}
        <Snackbar 
          open={notification.open} 
          autoHideDuration={2000} 
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity} 
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
        
        {/* Congratulations dialog */}
        <Dialog
          open={congratsOpen}
          onClose={() => setCongratsOpen(false)}
        >
          <DialogTitle>Congratulations!</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You found all {hiddenWords.length} words! Would you like to play again?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCongratsOpen(false)}>Close</Button>
            <Button 
              onClick={() => {
                setCongratsOpen(false);
                initializeGrid();
              }} 
              variant="contained" 
              color="primary" 
              autoFocus
            >
              New Game
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}

export default App;