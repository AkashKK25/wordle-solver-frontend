document.addEventListener('DOMContentLoaded', function() {
    // Help icon toggle with transparency effect
    const helpIcon = document.getElementById('help-icon');
    const instructions = document.getElementById('instructions');
    
    helpIcon.addEventListener('mouseover', function() {
        instructions.style.display = 'block';
    });
    
    helpIcon.addEventListener('mouseout', function() {
        instructions.style.display = 'none';
    });
    
    // Create all 6 rows like in Wordle
    const wordGrids = document.getElementById('word-grids');
    
    // Dynamically adding 5 more rows
    for (let r = 1; r < 6; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'word-row mb-2';
        
        const flexDiv = document.createElement('div');
        flexDiv.className = 'd-flex justify-content-center';
        
        for (let p = 0; p < 5; p++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = r;
            cell.dataset.position = p;
            cell.dataset.state = 'empty';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'letter-input';
            input.pattern = '[A-Za-z]';
            input.disabled = true; // Disable all inputs in rows after the first
            
            cell.appendChild(input);
            flexDiv.appendChild(cell);
        }
        
        rowDiv.appendChild(flexDiv);
        wordGrids.appendChild(rowDiv);
    }
    
    // Helper function to check if a row is complete
    function isRowComplete(rowIndex) {
        const rowCells = document.querySelectorAll(`.grid-cell[data-row="${rowIndex}"]`);
        for (let cell of rowCells) {
            const input = cell.querySelector('.letter-input');
            if (!input.value) {
                return false;
            }
        }
        return true;
    }
    
    // Helper function to enable the next row if current row is complete
    function checkAndEnableNextRow(currentRowIndex) {
        if (isRowComplete(currentRowIndex) && currentRowIndex < 5) {
            const nextRowInputs = document.querySelectorAll(`.grid-cell[data-row="${currentRowIndex + 1}"] .letter-input`);
            nextRowInputs.forEach(input => {
                input.disabled = false;
            });
            // Focus on the first cell of the next row
            nextRowInputs[0].focus();
        }
    }
    
    // Grid cell cycling for all cells
    const cells = document.querySelectorAll('.grid-cell');
    
    cells.forEach(cell => {
        cell.addEventListener('click', function() {
            const input = this.querySelector('.letter-input');
            if (!input.value || input.disabled) return;
            
            const currentState = this.dataset.state;
            let newState;
            
            if (currentState === 'empty' || currentState === 'absent') {
                newState = 'present';
                this.classList.remove('absent');
                this.classList.add('present');
            } else if (currentState === 'present') {
                newState = 'correct';
                this.classList.remove('present');
                this.classList.add('correct');
            } else {
                newState = 'absent';
                this.classList.remove('correct');
                this.classList.add('absent');
            }
            
            this.dataset.state = newState;
        });
        
        const input = cell.querySelector('.letter-input');
        input.addEventListener('input', function() {
            if (this.value) {
                cell.dataset.state = 'absent';
                cell.classList.add('absent');
            } else {
                cell.dataset.state = 'empty';
                cell.classList.remove('absent', 'present', 'correct');
            }
            
            // Auto-advance to next input (within the same row)
            if (this.value) {
                const row = parseInt(cell.dataset.row);
                const position = parseInt(cell.dataset.position);
                if (position < 4) {
                    const nextInput = document.querySelector(`.grid-cell[data-row="${row}"][data-position="${position + 1}"] .letter-input`);
                    nextInput.focus();
                } else {
                    // Checking if we should enable the next row
                    checkAndEnableNextRow(row);
                }
            }
        });
        
        // Handle backspace to go to previous cell and Enter to trigger solve
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value) {
                const row = parseInt(cell.dataset.row);
                const position = parseInt(cell.dataset.position);
                if (position > 0) {
                    const prevInput = document.querySelector(`.grid-cell[data-row="${row}"][data-position="${position - 1}"] .letter-input`);
                    prevInput.focus();
                }
            } else if (e.key === 'Enter') {
                // Check if any row has been fully filled
                let hasFilledRow = false;
                for (let r = 0; r < 6; r++) {
                    if (isRowComplete(r)) {
                        hasFilledRow = true;
                        break;
                    }
                }
                
                // If at least one row is filled, trigger the solve button
                if (hasFilledRow) {
                    document.getElementById('solve-btn').click();
                }
            } else if (e.key === 'Delete') {
                document.getElementById('reset-btn').click();
            }
        });
    });
    
    // Solve button functionality
    document.getElementById('solve-btn').addEventListener('click', function() {
        const green = Array(5).fill('?');
        const yellow = [];
        const yellowPositions = [];
        const black = [];
        
        cells.forEach(cell => {
            const letter = cell.querySelector('.letter-input').value.toLowerCase();
            const position = parseInt(cell.dataset.position);
            const state = cell.dataset.state;
            
            if (letter && state === 'correct') {
                green[position] = letter;
            } else if (letter && state === 'present') {
                yellow.push(letter);
                yellowPositions.push(position + 1); // 1-indexed for the algorithm
            } else if (letter && state === 'absent') {
                if (!black.includes(letter)) {
                    black.push(letter);
                }
            }
        });
        
        const data = {
            green: green.join(''),
            black: black.join(''),
            yellow_letters: yellow.join(''),
            yellow_positions: yellowPositions.join('')
        };
        
        fetch('https://YOUR-API-GATEWAY-URL/solve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            const commonWordList = document.getElementById('common-word-list');
            const rareWordList = document.getElementById('rare-word-list');
            
            // Handle common words list
            if (data.common_words.length === 0) {
                commonWordList.innerHTML = '<p>No common words found matching these constraints.</p>';
            } else {
                let commonHtml = '<div class="row">';
                data.common_words.forEach(word => {
                    commonHtml += `<div class="col-md-3 col-6 mb-2">${word}</div>`;
                });
                commonHtml += '</div>';
                commonWordList.innerHTML = commonHtml;
            }
            
            // Handle rare words list
            if (data.rare_words.length === 0) {
                rareWordList.innerHTML = '<p>No rare words found matching these constraints.</p>';
            } else {
                let rareHtml = '<div class="row">';
                data.rare_words.forEach(word => {
                    rareHtml += `<div class="col-md-3 col-6 mb-2">${word}</div>`;
                });
                rareHtml += '</div>';
                rareWordList.innerHTML = rareHtml;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('common-word-list').innerHTML = 
                '<p class="text-danger">An error occurred. Please try again.</p>';
            document.getElementById('rare-word-list').innerHTML = '';
        });
    });
    
    // Reset button functionality
    document.getElementById('reset-btn').addEventListener('click', function() {
        cells.forEach(cell => {
            const input = cell.querySelector('.letter-input');
            cell.dataset.state = 'empty';
            cell.classList.remove('absent', 'present', 'correct');
            input.value = '';
            
            // Disable all inputs except those in the first row
            const row = parseInt(cell.dataset.row);
            if (row > 0) {
                input.disabled = true;
            } else {
                input.disabled = false;
            }
        });
        
        document.getElementById('common-word-list').innerHTML = 
            '<p id="common-initial-message">Enter your Wordle clues and click "Solve" to see common words.</p>';
        document.getElementById('rare-word-list').innerHTML = 
            '<p id="rare-initial-message">Enter your Wordle clues and click "Solve" to see rare words.</p>';
        
        // Focus on the first cell
        document.querySelector('.grid-cell[data-row="0"][data-position="0"] .letter-input').focus();
    });
});
