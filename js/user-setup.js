/**
 * user-setup.js - First-time user setup for Electron app
 * Only runs in Electron environment
 */

(function() {
    // Only run in Electron
    if (!window.electronAPI || !window.electronAPI.isElectron) {
        return;
    }

    // Check if user name is already set
    async function checkUserSetup() {
        const userName = await window.electronAPI.getUserName();
        
        if (!userName) {
            // First time user - show setup dialog
            showUserSetupDialog();
        } else {
            // User already set up
            console.log('Welkom terug,', userName);
            
            // Store in localStorage for quick access
            if (window.localStorage) {
                localStorage.setItem('mindmap_user_name', userName);
            }
        }
    }

    // Show the user setup dialog
    function showUserSetupDialog() {
        // Check if dialog already exists
        if (document.querySelector('.user-setup-modal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal user-setup-modal';
        modal.style.display = 'flex';
        modal.style.zIndex = '10000'; // Ensure it's on top

        modal.innerHTML = `
            <div class="modal-content user-setup-content">
                <div class="modal-header">
                    <h2>Welkom bij Mindmap! 👋</h2>
                </div>
                <div class="modal-body">
                    <p>Voordat we beginnen, hoe mogen we je noemen?</p>
                    <p class="setup-explanation">Dit wordt gebruikt om je te identificeren wanneer je samenwerkt aan gedeelde bestanden.</p>
                    
                    <div class="form-group">
                        <label for="user-first-name">Voornaam:</label>
                        <input 
                            type="text" 
                            id="user-first-name" 
                            class="form-input" 
                            placeholder="Bijv. Mark"
                            maxlength="30"
                            autocomplete="given-name"
                        />
                        <div class="error-message" id="name-error" style="display: none; color: #ff6b6b; margin-top: 5px;">
                            Voer alstublieft uw voornaam in
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="save-user-name">
                        Doorgaan
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Focus the input
        const input = modal.querySelector('#user-first-name');
        const errorDiv = modal.querySelector('#name-error');
        const saveBtn = modal.querySelector('#save-user-name');

        setTimeout(() => {
            input.focus();
        }, 100);

        // Handle save
        const saveUserName = async () => {
            const name = input.value.trim();
            
            if (!name) {
                errorDiv.style.display = 'block';
                input.focus();
                input.classList.add('error');
                return;
            }

            // Save to electron-store
            await window.electronAPI.setUserName(name);
            
            // Also save to localStorage for quick access
            if (window.localStorage) {
                localStorage.setItem('mindmap_user_name', name);
                // Also update the author field if it exists
                localStorage.setItem('mindmap_author', name);
            }

            // Show welcome message
            if (typeof showToast === 'function') {
                showToast(`Welkom ${name}! Laten we beginnen met mindmappen 🎉`);
            }

            // Close dialog
            document.body.removeChild(modal);

            // Trigger any collaboration setup if needed
            if (window.Collaboration && typeof window.Collaboration.initialize === 'function') {
                window.Collaboration.initialize(name);
            }
        };

        // Event listeners
        saveBtn.addEventListener('click', saveUserName);
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveUserName();
            }
            // Clear error on typing
            if (errorDiv.style.display === 'block') {
                errorDiv.style.display = 'none';
                input.classList.remove('error');
            }
        });

        // Prevent closing by clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // Flash the dialog to indicate it's required
                const content = modal.querySelector('.modal-content');
                content.classList.add('shake');
                setTimeout(() => {
                    content.classList.remove('shake');
                }, 500);
            }
        });
    }

    // Add setup-specific styles
    const style = document.createElement('style');
    style.textContent = `
        .user-setup-content {
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        }
        
        .setup-explanation {
            font-size: 0.9em;
            color: #888;
            margin-top: 5px;
        }
        
        .user-setup-modal .form-input {
            width: 100%;
            padding: 10px;
            font-size: 16px;
            border: 2px solid #333;
            border-radius: 8px;
            background: #2a2a2a;
            color: white;
            margin-top: 10px;
        }
        
        .user-setup-modal .form-input:focus {
            outline: none;
            border-color: #4a9eff;
            box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1);
        }
        
        .user-setup-modal .form-input.error {
            border-color: #ff6b6b;
        }
        
        .user-setup-modal .btn-primary {
            background: #4a9eff;
            color: white;
            padding: 10px 30px;
            font-size: 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .user-setup-modal .btn-primary:hover {
            background: #3a8eef;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .shake {
            animation: shake 0.5s;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
    `;
    document.head.appendChild(style);

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkUserSetup);
    } else {
        // Small delay to ensure Electron bridge is ready
        setTimeout(checkUserSetup, 100);
    }
})();