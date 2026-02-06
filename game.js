class ColorDashGame extends Phaser.Scene {
    constructor() {
        super({ key: 'ColorDashGame' });
    }

    init() {
        this.colors = [
            { name: 'Red', code: 'R', value: 0xff0000, hex: '#ff0000' },
            { name: 'Orange', code: 'O', value: 0xff6b00, hex: '#ff6b00' },
            { name: 'Yellow', code: 'Y', value: 0xffff00, hex: '#ffff00' },
            { name: 'Blue', code: 'B', value: 0x0066ff, hex: '#0066ff' }
        ];
        this.playerColorIndex = 0;
        this.speed = 360;
        this.distance = 0;
        this.highestDistance = this.loadHighestDistance();
        this.previousHighestDistance = this.highestDistance;
        this.recordBeatenShown = false;
        this.gateTimer = null;
        this.gates = null;
        this.gameOver = false;
        this.gameStarted = false;
        this.coins = null;
        this.coinTimer = null;
        this.coinsCollected = 0;
        this.totalCoins = this.loadCoins();
        this.selectedSkin = this.loadSelectedSkin();
        this.skins = this.initializeSkins();
        this.lastCoinDistance = 0; // Track last distance when coin was awarded
        this.lastSpeedIncreaseDistance = 0; // Track last distance when speed increased
    }

    create() {
        // Ensure variables are initialized even if init() wasn't called
        if (typeof this.distance === 'undefined') {
            this.distance = 0;
        }
        if (typeof this.highestDistance === 'undefined') {
            this.highestDistance = this.loadHighestDistance();
        }
        if (typeof this.previousHighestDistance === 'undefined') {
            this.previousHighestDistance = this.highestDistance;
        }
        if (typeof this.recordBeatenShown === 'undefined') {
            this.recordBeatenShown = false;
        }
        if (typeof this.speed === 'undefined') {
            this.speed = 360;
        }
        if (typeof this.gameOver === 'undefined') {
            this.gameOver = false;
        }
        if (typeof this.gameStarted === 'undefined') {
            this.gameStarted = false;
        }
        if (typeof this.coins === 'undefined') {
            this.coins = null;
        }
        if (typeof this.coinTimer === 'undefined') {
            this.coinTimer = null;
        }
        if (typeof this.coinsCollected === 'undefined') {
            this.coinsCollected = 0;
        }
        if (typeof this.totalCoins === 'undefined') {
            this.totalCoins = this.loadCoins();
        }
        if (typeof this.selectedSkin === 'undefined') {
            this.selectedSkin = this.loadSelectedSkin();
        }
        if (typeof this.skins === 'undefined') {
            this.skins = this.initializeSkins();
        }
        if (typeof this.lastCoinDistance === 'undefined') {
            this.lastCoinDistance = 0;
        }
        if (typeof this.lastSpeedIncreaseDistance === 'undefined') {
            this.lastSpeedIncreaseDistance = 0;
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Detect mobile device
        this.isMobile = width < 768 || height < 600;
        // Calculate scale factor for mobile
        this.scaleFactor = this.isMobile ? Math.min(width / 400, height / 600) : 1;
        // Dark background for glowing effects
        this.cameras.main.setBackgroundColor('#1a1a3e');

        this.createBackground(width, height);
        this.createUI(width, height);
        this.createTrack(width, height);
        this.createPlayer(width, height);
        this.createGates();
        this.setupControls();
        // Don't start the game yet - wait for start button
        this.scale.on('resize', this.handleResize, this);
        this.updateUI(); // Initialize UI with correct values
        this.createStartScreen(width, height);

        // Start background music if enabled (after a short delay to ensure audio context is ready)
        if (window.soundManager && window.soundManager.musicEnabled) {
            this.time.delayedCall(500, () => {
                if (window.soundManager && window.soundManager.musicEnabled) {
                    window.soundManager.startBackgroundMusic();
                }
            });
        }
    }

    createBackground(width, height) {
        const stripes = this.add.graphics();
        for (let i = 0; i < 24; i++) {
            const alpha = Phaser.Math.FloatBetween(0.05, 0.12);
            // Pinkish-blue tinted stripes
            stripes.fillStyle(0xd4a8ff, alpha);
            stripes.fillRoundedRect(-20 + i * 80, 0, 60, height, 28);
        }
        stripes.generateTexture('colorDash-bg', width + 160, height);
        stripes.destroy();
        this.bgImage = this.add.tileSprite(width / 2, height / 2, width + 160, height, 'colorDash-bg').setDepth(-10);
        this.tweens.add({
            targets: this.bgImage,
            tilePositionX: { from: 0, to: 160 },
            duration: 3200,
            ease: 'Linear',
            repeat: -1
        });

        const particlesKey = 'colorDash-spark';
        if (!this.textures.exists(particlesKey)) {
            const gfx = this.make.graphics({ add: false });
            gfx.fillStyle(0xffffff, 1);
            gfx.fillCircle(5, 5, 5);
            gfx.generateTexture(particlesKey, 10, 10);
            gfx.destroy();
        }
        const sparkEmitter = this.add.particles(width / 2, -20, particlesKey, {
            lifespan: 2200,
            speedY: { min: 120, max: 260 },
            speedX: { min: -60, max: 60 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.3, end: 0 },
            frequency: 120,
            blendMode: 'ADD',
            emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-width / 2, 0, width, 1) }
        });
        sparkEmitter.setDepth(-9);
    }

    createUI(width, height) {
        // Responsive font sizes and positions
        const titleFontSize = this.isMobile ? Math.max(28, 42 * this.scaleFactor) : 42;
        const headerFontSize = this.isMobile ? Math.max(16, 22 * this.scaleFactor) : 22;
        const subHeaderFontSize = this.isMobile ? Math.max(14, 18 * this.scaleFactor) : 18;
        const titleY = this.isMobile ? Math.max(35, 50 * this.scaleFactor) : 50;
        const topMargin = this.isMobile ? Math.max(20, 32 * this.scaleFactor) : 32;
        const topSpacing = this.isMobile ? Math.max(28, 34 * this.scaleFactor) : 34;

        this.add.text(width / 2, titleY, 'Color Dash', {
            fontSize: titleFontSize + 'px',
            fill: '#ffb6c1',
            fontFamily: 'Fredoka, Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, '#ffb6c1', 20, true, true).setShadow(0, 0, '#d4a8ff', 30, true, true);

        this.distanceText = this.add.text(width - (this.isMobile ? 10 : 40), topMargin, 'Distance: 0m', {
            fontSize: headerFontSize + 'px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0).setShadow(0, 0, '#ffb6c1', 12, true, true);

        this.highestDistanceText = this.add.text(width - (this.isMobile ? 10 : 40), topMargin + topSpacing, 'Best: ' + Math.round(this.highestDistance) + 'm', {
            fontSize: subHeaderFontSize + 'px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0).setShadow(0, 0, '#ffd700', 15, true, true).setShadow(0, 0, '#ffaa00', 25, true, true);

        this.speedText = this.add.text(width - (this.isMobile ? 10 : 40), topMargin + (topSpacing * 2), 'Speed: 360', {
            fontSize: (this.isMobile ? Math.max(16, 20 * this.scaleFactor) : 20) + 'px',
            fill: '#d4a8ff',
            fontFamily: 'Arial'
        }).setOrigin(1, 0).setShadow(0, 0, '#d4a8ff', 10, true, true);

        // Ensure totalCoins is loaded
        if (typeof this.totalCoins === 'undefined' || this.totalCoins === null) {
            this.totalCoins = this.loadCoins();
        }

        // Coin counter with background for better visibility (responsive)
        const coinBgWidth = this.isMobile ? Math.max(100, 140 * this.scaleFactor) : 140;
        const coinBgHeight = this.isMobile ? Math.max(28, 35 * this.scaleFactor) : 35;
        const coinX = this.isMobile ? 10 : 40;
        const coinY = topMargin;
        this.coinBg = this.add.rectangle(coinX, coinY, coinBgWidth, coinBgHeight, 0x2d1b4e, 0.9)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0xffd700, 0.8)
            .setDepth(10);
        const coinFontSize = this.isMobile ? Math.max(18, 24 * this.scaleFactor) : 24;
        this.coinText = this.add.text(coinX + (coinBgWidth / 2), coinY + (coinBgHeight / 2), '🪙 ' + (this.totalCoins || 0), {
            fontSize: coinFontSize + 'px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5).setDepth(11).setShadow(0, 0, '#ffd700', 15, true, true).setShadow(0, 0, '#ffaa00', 20, true, true);

        // Also add coin counter in top-right corner for easy viewing
        const coinTopRightY = this.isMobile ? (topMargin + (topSpacing * 2) + 20) : 134;
        this.coinTextTopRight = this.add.text(width - (this.isMobile ? 10 : 40), coinTopRightY, '🪙 Coins: ' + (this.totalCoins || 0), {
            fontSize: (this.isMobile ? Math.max(16, 20 * this.scaleFactor) : 20) + 'px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0).setDepth(11).setShadow(0, 0, '#ffd700', 12, true, true);

        // Shop button - responsive size and position
        const shopButtonWidth = this.isMobile ? Math.max(70, 100 * this.scaleFactor) : 100;
        const shopButtonHeight = this.isMobile ? Math.max(32, 40 * this.scaleFactor) : 40;
        const shopButtonY = this.isMobile ? (topMargin + topSpacing + 15) : 80;
        this.shopButton = this.add.rectangle(coinX, shopButtonY, shopButtonWidth, shopButtonHeight, 0x2d1b4e, 0.8)
            .setOrigin(0, 0.5)
            .setStrokeStyle(2, 0xffd700, 0.8)
            .setInteractive({ useHandCursor: true })
            .setDepth(30);
        const shopFontSize = this.isMobile ? Math.max(12, 16 * this.scaleFactor) : 16;
        this.shopLabel = this.add.text(coinX + (shopButtonWidth / 2), shopButtonY, '🛍️ Shop', {
            fontSize: shopFontSize + 'px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(31).setShadow(0, 0, '#ffd700', 10, true, true);
        this.shopButton.on('pointerover', () => this.tweens.add({ targets: this.shopButton, scaleX: 1.05, scaleY: 1.05, duration: 140 }));
        this.shopButton.on('pointerout', () => this.tweens.add({ targets: this.shopButton, scaleX: 1, scaleY: 1, duration: 140 }));
        this.shopButton.on('pointerdown', () => {
            if (window.soundManager) window.soundManager.playClick();
            this.showShop();
        });
        this.shopLabel.setInteractive({ useHandCursor: true })
            .on('pointerover', () => this.shopButton.emit('pointerover'))
            .on('pointerout', () => this.shopButton.emit('pointerout'))
            .on('pointerdown', () => {
                if (window.soundManager) window.soundManager.playClick();
                this.showShop();
            });

        // Instruction bar background (responsive size)
        const instructionBarHeight = this.isMobile ? Math.max(70, 90 * this.scaleFactor) : 90;
        const instructionBarY = height - (this.isMobile ? Math.max(30, 42 * this.scaleFactor) : 42);
        this.instructionBar = this.add.rectangle(width / 2, instructionBarY, width * 0.9, instructionBarHeight, 0x1a1a3e, 0.8)
            .setStrokeStyle(2, 0xd4a8ff, 0.6)
            .setDepth(5);

        const instructionFontSize = this.isMobile ? Math.max(12, 17 * this.scaleFactor) : 17;
        const instructionY = height - (this.isMobile ? Math.max(50, 70 * this.scaleFactor) : 70);
        this.instructions = this.add.text(width / 2, instructionY,
            '⚠️ Match your color with the gate BEFORE it reaches the end and disappears! ⚠️', {
            fontSize: instructionFontSize + 'px',
            fill: '#ffeb3b',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            align: 'center',
            wordWrap: { width: width * (this.isMobile ? 0.9 : 0.85) }
        }).setOrigin(0.5).setDepth(6).setShadow(0, 0, '#ffeb3b', 15, true, true);

        const coinInstructionFontSize = this.isMobile ? Math.max(11, 15 * this.scaleFactor) : 15;
        const coinInstructionY = height - (this.isMobile ? Math.max(25, 40 * this.scaleFactor) : 40);
        this.coinInstructions = this.add.text(width / 2, coinInstructionY,
            '🪙 Earn 5 coins every 500m • Speed increases every 1000m • Buy skins in the shop! 🪙', {
            fontSize: coinInstructionFontSize + 'px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            align: 'center',
            wordWrap: { width: width * (this.isMobile ? 0.9 : 0.85) }
        }).setOrigin(0.5).setDepth(6).setShadow(0, 0, '#ffd700', 12, true, true);

        // Color selection buttons (responsive)
        this.colorButtons = [];
        const buttonSize = this.isMobile ? Math.max(45, 60 * this.scaleFactor) : 60;
        const buttonY = height - (this.isMobile ? Math.max(80, 120 * this.scaleFactor) : 120);
        const buttonSpacing = this.isMobile ? Math.max(70, 120 * this.scaleFactor) : 120;
        const startX = width / 2 - (buttonSpacing * 1.5);

        this.colors.forEach((color, index) => {
            const buttonX = startX + (index * buttonSpacing);

            // Create glow effect behind button (square)
            const glowSize = buttonSize + (this.isMobile ? 8 : 10);
            const glow = this.add.rectangle(buttonX, buttonY, glowSize, glowSize, color.value, 0.3)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setDepth(5);

            // Create square button with no fill, colored border stroke matching each button
            const button = this.add.rectangle(buttonX, buttonY, buttonSize, buttonSize, 0x000000, 0)
                .setStrokeStyle(this.isMobile ? 3 : 4, color.value, 1.0)
                .setInteractive({ useHandCursor: true })
                .setDepth(6);

            // Add shadow effect (subtle) - square
            const shadow = this.add.rectangle(buttonX, buttonY + 2, buttonSize, buttonSize, 0x000000, 0.15)
                .setDepth(5);

            // Create button label with key letter - color matches outline (responsive)
            const labelFontSize = this.isMobile ? Math.max(20, 28 * this.scaleFactor) : 28;
            const label = this.add.text(buttonX, buttonY, color.code, {
                fontSize: labelFontSize + 'px',
                fill: color.hex,
                fontFamily: 'Arial',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: this.isMobile ? 3 : 4
            }).setOrigin(0.5).setDepth(7);
            label.setShadow(0, 0, '#000000', 10, true, true);
            label.setShadow(0, 0, color.hex, 8, true, true);

            // Continuous subtle pulsing glow animation
            this.tweens.add({
                targets: glow,
                alpha: { from: 0.2, to: 0.4 },
                scale: { from: 0.95, to: 1.05 },
                duration: 1000 + (index * 200),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Hover effects - more dramatic
            button.on('pointerover', () => {
                this.tweens.add({
                    targets: [button, shadow],
                    scaleX: 1.15,
                    scaleY: 1.15,
                    duration: 150,
                    ease: 'Back.easeOut'
                });
                this.tweens.add({
                    targets: glow,
                    scale: 1.3,
                    alpha: 0.6,
                    duration: 150
                });
                button.setStrokeStyle(5, color.value, 1.0); // Keep button's own color on hover, not yellow
                label.setScale(1.1);
                label.setTint(color.value); // Keep button color on hover
            });

            button.on('pointerout', () => {
                this.tweens.add({
                    targets: [button, shadow],
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 150,
                    ease: 'Back.easeIn'
                });
                this.tweens.add({
                    targets: glow,
                    scale: 1.0,
                    alpha: 0.3,
                    duration: 150
                });
                button.setStrokeStyle(4, color.value, 1.0); // Outline color matches button color
                label.setScale(1.0);
                label.clearTint();
            });

            // Click handler with better visual feedback
            button.on('pointerdown', (pointer) => {
                if (pointer && pointer.event) {
                    pointer.event.stopPropagation(); // Prevent global handler from firing
                }
                if (window.soundManager) window.soundManager.playClick();
                this.setColorByCode(color.code);
                // Visual feedback with rotation and scale
                this.tweens.add({
                    targets: [button, shadow, label],
                    scaleX: 1.3,
                    scaleY: 1.3,
                    duration: 150,
                    yoyo: true,
                    ease: 'Elastic.easeOut'
                });
                // Flash effect
                this.tweens.add({
                    targets: glow,
                    alpha: { from: 0.8, to: 0.3 },
                    scale: { from: 1.5, to: 1.0 },
                    duration: 300
                });
            });

            // Make label also clickable
            label.setInteractive({ useHandCursor: true });
            label.on('pointerover', () => button.emit('pointerover'));
            label.on('pointerout', () => button.emit('pointerout'));
            label.on('pointerdown', (pointer) => {
                if (pointer && pointer.event) {
                    pointer.event.stopPropagation(); // Prevent global handler from firing
                }
                button.emit('pointerdown');
            });

            this.colorButtons.push({ button, label, glow, shadow, colorIndex: index });
        });

        // Update button appearance based on current color
        this.updateColorButtons();

        const controlsFontSize = this.isMobile ? Math.max(10, 14 * this.scaleFactor) : 14;
        const controlsHintY = height - (this.isMobile ? Math.max(10, 15 * this.scaleFactor) : 15);
        const controlsText = this.isMobile ?
            'Tap buttons for direct color • Tap screen to cycle' :
            'Press R/O/Y/B or click buttons for direct color • Tap/Space/Up to cycle';
        this.controlsHint = this.add.text(width / 2, controlsHintY, controlsText, {
            fontSize: controlsFontSize + 'px',
            fill: '#ffb6c1',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: width * (this.isMobile ? 0.9 : 0.85) }
        }).setOrigin(0.5).setDepth(6);

        // Back button (responsive)
        const backButtonWidth = this.isMobile ? Math.max(90, 130 * this.scaleFactor) : 130;
        const backButtonHeight = this.isMobile ? Math.max(32, 44 * this.scaleFactor) : 44;
        const backButtonX = this.isMobile ? 10 : 30;
        const backButtonY = height - (this.isMobile ? Math.max(60, 100 * this.scaleFactor) : 100);
        this.backButton = this.add.rectangle(backButtonX, backButtonY, backButtonWidth, backButtonHeight, 0x2d1b4e, 0.8)
            .setOrigin(0, 0.5)
            .setStrokeStyle(2, 0xd4a8ff, 0.6)
            .setInteractive({ useHandCursor: true });
        const backLabelFontSize = this.isMobile ? Math.max(13, 18 * this.scaleFactor) : 18;
        this.backLabel = this.add.text(backButtonX + (backButtonWidth / 2), backButtonY, '← Menu', {
            fontSize: backLabelFontSize + 'px',
            fill: '#ffb6c1',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, '#ffb6c1', 10, true, true);
        const goBack = () => {
            if (typeof window !== 'undefined' && typeof window.returnToMenu === 'function') {
                window.returnToMenu();
            } else {
                this.scene.stop();
            }
        };
        this.backButton.on('pointerover', () => this.tweens.add({ targets: this.backButton, scaleX: 1.05, scaleY: 1.05, duration: 140 }));
        this.backButton.on('pointerout', () => this.tweens.add({ targets: this.backButton, scaleX: 1, scaleY: 1, duration: 140 }));
        this.backButton.on('pointerdown', (pointer) => {
            if (pointer.event && typeof pointer.event.stopPropagation === 'function') {
                pointer.event.stopPropagation();
            }
            if (window.soundManager) window.soundManager.playClick();
            goBack();
        });
        this.backLabel.setInteractive({ useHandCursor: true })
            .on('pointerover', () => this.backButton.emit('pointerover'))
            .on('pointerout', () => this.backButton.emit('pointerout'))
            .on('pointerdown', (pointer) => {
                if (pointer.event && typeof pointer.event.stopPropagation === 'function') {
                    pointer.event.stopPropagation();
                }
                if (window.soundManager) window.soundManager.playClick();
                goBack();
            });

        // Music toggle button
        const musicBtnX = width - 40;
        const musicBtnY = height - 100;
        this.musicButton = this.add.rectangle(musicBtnX, musicBtnY, 50, 50, 0x2d1b4e, 0.8)
            .setOrigin(1, 0.5)
            .setStrokeStyle(2, 0xd4a8ff, 0.6)
            .setInteractive({ useHandCursor: true })
            .setDepth(100)
            .setScrollFactor(0);
        const musicIconText = window.soundManager && window.soundManager.musicEnabled ? '🎵' : '🔇';
        this.musicIcon = this.add.text(musicBtnX, musicBtnY, musicIconText, {
            fontSize: '24px',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(101).setScrollFactor(0);
        console.log('Music button created at:', musicBtnX, musicBtnY, 'Icon:', musicIconText);
        this.musicButton.on('pointerdown', () => {
            console.log('Music button clicked');
            if (window.soundManager) {
                window.soundManager.resumeContext();
                window.soundManager.playClick();
                const enabled = window.soundManager.toggleMusic();
                this.musicIcon.setText(enabled ? '🎵' : '🔇');
                console.log('Music toggled, now enabled:', enabled);
            }
        });
    }

    createStartScreen(width, height) {
        // Store all start screen elements for cleanup
        this.startScreenElements = [];

        // Overlay
        this.startOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setDepth(25)
            .setInteractive();
        this.startScreenElements.push(this.startOverlay);

        // Start panel
        const panelWidth = width * 0.5;
        const panelHeight = height * 0.3;
        this.startPanel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x041029, 0.95)
            .setDepth(26)
            .setStrokeStyle(3, 0xffd700, 0.9);
        this.startScreenElements.push(this.startPanel);

        // Title (responsive)
        const startTitleFontSize = this.isMobile ? Math.max(32, 48 * this.scaleFactor) : 48;
        const startTitleY = height / 2 - (this.isMobile ? 40 : 60);
        this.startTitle = this.add.text(width / 2, startTitleY, 'Color Dash', {
            fontSize: startTitleFontSize + 'px',
            fill: '#ffb6c1',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(27).setShadow(0, 0, '#ffb6c1', 20, true, true).setShadow(0, 0, '#d4a8ff', 30, true, true);
        this.startScreenElements.push(this.startTitle);

        // Instructions (responsive)
        const startInstructionsFontSize = this.isMobile ? Math.max(14, 18 * this.scaleFactor) : 18;
        const startInstructionsY = height / 2 - (this.isMobile ? 5 : 10);
        this.startInstructions = this.add.text(width / 2, startInstructionsY, 'Match colors with gates to score!\nEarn 5 coins every 500m!\nSpeed increases every 1000m!', {
            fontSize: startInstructionsFontSize + 'px',
            fill: '#d9f7ff',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: width * 0.8 }
        }).setOrigin(0.5).setDepth(27);
        this.startScreenElements.push(this.startInstructions);

        // Start button (responsive)
        const startButtonWidth = this.isMobile ? Math.max(150, 200 * this.scaleFactor) : 200;
        const startButtonHeight = this.isMobile ? Math.max(45, 60 * this.scaleFactor) : 60;
        const startButtonY = height / 2 + (this.isMobile ? 35 : 50);
        this.startButton = this.add.rectangle(width / 2, startButtonY, startButtonWidth, startButtonHeight, 0x0a4d6f, 0.95)
            .setDepth(26)
            .setStrokeStyle(3, 0xffd700, 0.9)
            .setInteractive({ useHandCursor: true });
        this.startScreenElements.push(this.startButton);

        const startButtonTextFontSize = this.isMobile ? Math.max(24, 32 * this.scaleFactor) : 32;
        this.startButtonText = this.add.text(width / 2, startButtonY, 'START', {
            fontSize: startButtonTextFontSize + 'px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(27).setShadow(0, 0, '#ffd700', 15, true, true);
        this.startScreenElements.push(this.startButtonText);

        // Button hover effects
        this.startButton.on('pointerover', () => {
            this.tweens.add({ targets: this.startButton, scaleX: 1.1, scaleY: 1.1, duration: 200 });
            this.tweens.add({ targets: this.startButtonText, scaleX: 1.1, scaleY: 1.1, duration: 200 });
        });
        this.startButton.on('pointerout', () => {
            this.tweens.add({ targets: this.startButton, scaleX: 1, scaleY: 1, duration: 200 });
            this.tweens.add({ targets: this.startButtonText, scaleX: 1, scaleY: 1, duration: 200 });
        });

        // Start button click handler
        const startGame = () => {
            if (window.soundManager) window.soundManager.playClick();
            this.gameStarted = true;
            this.scheduleGates();
            // Reset distance milestones
            this.lastCoinDistance = 0;
            this.lastSpeedIncreaseDistance = 0;

            // Destroy all start screen elements immediately
            this.startScreenElements.forEach(element => {
                if (element && element.active) {
                    element.destroy();
                }
            });
            this.startScreenElements = [];
            this.startOverlay = null;
            this.startPanel = null;
            this.startTitle = null;
            this.startInstructions = null;
            this.startButton = null;
            this.startButtonText = null;
        };

        this.startButton.on('pointerdown', startGame);
        this.startButtonText.setInteractive({ useHandCursor: true }).on('pointerdown', startGame);
    }

    createTrack(width, height) {
        this.trackTop = height * 0.25;
        this.trackBottom = height * 0.78;
        this.trackWidth = width * 0.7;
        const zone = this.add.rectangle(width / 2, (this.trackTop + this.trackBottom) / 2, this.trackWidth, this.trackBottom - this.trackTop, 0xffb3d9, 0.25)
            .setStrokeStyle(3, 0xd4a8ff, 0.6);
        zone.setDepth(-8);

        const laneCount = this.colors.length;
        for (let i = 0; i < laneCount; i++) {
            const laneY = Phaser.Math.Linear(this.trackBottom, this.trackTop, i / (laneCount - 1));
            this.add.rectangle(width / 2, laneY, this.trackWidth, 6, this.colors[i].value, 0.12)
                .setDepth(-7);
        }

        this.foregroundLight = this.add.rectangle(width / 2, this.trackBottom + 26, this.trackWidth, 50, 0xd4a8ff, 0.2)
            .setDepth(-6)
            .setBlendMode(Phaser.BlendModes.ADD);
    }

    createPlayer(width, height) {
        const skin = this.skins[this.selectedSkin];
        const x = width * 0.28;
        const y = (this.trackTop + this.trackBottom) / 2;

        // Responsive runner size
        const runnerSize = this.isMobile ? Math.max(18, 24 * this.scaleFactor) : 24;
        const strokeSize = this.isMobile ? 3 : 4;

        if (skin.type === 'circle') {
            this.runner = this.add.circle(x, y, runnerSize, this.colors[this.playerColorIndex].value)
                .setStrokeStyle(strokeSize, 0xffffff, 0.9);
        } else if (skin.type === 'triangle') {
            const textureSize = this.isMobile ? Math.max(36, 48 * this.scaleFactor) : 48;
            const gfx = this.make.graphics({ add: false });
            gfx.fillStyle(this.colors[this.playerColorIndex].value);
            gfx.lineStyle(strokeSize, 0xffffff, 0.9);
            gfx.beginPath();
            const triangleSize = textureSize / 2;
            gfx.moveTo(0, -triangleSize);
            gfx.lineTo(-triangleSize * 0.83, triangleSize * 0.83);
            gfx.lineTo(triangleSize * 0.83, triangleSize * 0.83);
            gfx.closePath();
            gfx.fillPath();
            gfx.strokePath();
            gfx.generateTexture('runner-triangle', textureSize, textureSize);
            gfx.destroy();
            this.runner = this.add.image(x, y, 'runner-triangle');
        } else if (skin.type === 'star') {
            const textureSize = this.isMobile ? Math.max(36, 48 * this.scaleFactor) : 48;
            const gfx = this.make.graphics({ add: false });
            gfx.fillStyle(this.colors[this.playerColorIndex].value);
            gfx.lineStyle(strokeSize, 0xffffff, 0.9);
            const points = 5;
            const outerRadius = textureSize / 2;
            const innerRadius = outerRadius / 2;
            gfx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / points - Math.PI / 2;
                const px = Math.cos(angle) * radius;
                const py = Math.sin(angle) * radius;
                if (i === 0) gfx.moveTo(px, py);
                else gfx.lineTo(px, py);
            }
            gfx.closePath();
            gfx.fillPath();
            gfx.strokePath();
            gfx.generateTexture('runner-star', textureSize, textureSize);
            gfx.destroy();
            this.runner = this.add.image(x, y, 'runner-star');
        } else {
            // Default rectangle (responsive)
            const rectSize = this.isMobile ? Math.max(36, 48 * this.scaleFactor) : 48;
            this.runner = this.add.rectangle(x, y, rectSize, rectSize, this.colors[this.playerColorIndex].value)
                .setStrokeStyle(strokeSize, 0xffffff, 0.9);
        }

        this.physics.add.existing(this.runner);
        this.runner.body.setAllowGravity(false);
        this.runner.body.setImmovable(true);
        const runnerBodySize = this.isMobile ? Math.max(36, 48 * this.scaleFactor) : 48;
        this.runner.body.setSize(runnerBodySize, runnerBodySize);

        this.trail = this.add.particles(this.runner.x, this.runner.y, 'colorDash-spark', {
            lifespan: 400,
            speedX: { min: -20, max: -80 },
            speedY: { min: -10, max: 10 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.35, end: 0 },
            frequency: 24,
            blendMode: 'ADD'
        });
        this.trail.setDepth(-5);
    }

    createGates() {
        this.gates = this.physics.add.group();
        // Set up overlap detection - callback receives (runner, gate)
        this.physics.add.overlap(this.runner, this.gates, (runner, gate) => {
            this.handleGatePass(runner, gate);
        }, null, this);
    }

    awardCoin() {
        // Ensure totalCoins is initialized
        if (typeof this.totalCoins === 'undefined' || this.totalCoins === null) {
            this.totalCoins = this.loadCoins();
        }

        this.coinsCollected += 5;
        this.totalCoins += 5;
        this.saveCoins(this.totalCoins);

        // Play sound
        if (window.soundManager) window.soundManager.playMatch();

        // Show coin award effect at the top of the screen (responsive)
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const coinPopupFontSize = this.isMobile ? Math.max(22, 32 * this.scaleFactor) : 32;
        const coinPopupY = this.isMobile ? Math.max(100, 150 * this.scaleFactor) : 150;
        const coinText = this.add.text(width / 2, coinPopupY, '🪙 +5 Coins!', {
            fontSize: coinPopupFontSize + 'px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(15).setShadow(0, 0, '#ffd700', 20, true, true);

        this.tweens.add({
            targets: coinText,
            y: coinText.y - 30,
            alpha: 0,
            scale: 1.2,
            duration: 1000,
            ease: 'Sine.easeOut',
            onComplete: () => coinText.destroy()
        });

        // Update coin counter
        this.updateCoinCounter();
    }

    increaseSpeed() {
        this.speed += 10;
        this.speed = Phaser.Math.Clamp(this.speed, 320, 840);

        // Show speed increase effect
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const speedText = this.add.text(width / 2, height / 2 - 100, '⚡ Speed Up!', {
            fontSize: '28px',
            fill: '#d4a8ff',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(15).setShadow(0, 0, '#d4a8ff', 15, true, true);

        this.tweens.add({
            targets: speedText,
            y: speedText.y - 30,
            alpha: 0,
            duration: 800,
            ease: 'Sine.easeOut',
            onComplete: () => speedText.destroy()
        });
    }

    setupControls() {
        // Mobile-friendly touch controls
        this.input.addPointer(3); // Support up to 3 simultaneous touches

        // Touch/click anywhere to cycle color (works on mobile)
        this.input.on('pointerdown', (pointer) => {
            // Only cycle if not clicking on UI elements
            if (!this.isClickingUI(pointer)) {
                this.cycleColor();
            }
        });

        // Keyboard controls (for desktop)
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-SPACE', () => this.cycleColor());
            this.input.keyboard.on('keydown-UP', () => this.cycleColor());

            // Direct color selection with keyboard keys
            this.input.keyboard.on('keydown-R', () => this.setColorByCode('R'));
            this.input.keyboard.on('keydown-O', () => this.setColorByCode('O'));
            this.input.keyboard.on('keydown-Y', () => this.setColorByCode('Y'));
            this.input.keyboard.on('keydown-B', () => this.setColorByCode('B'));
        }
    }

    isClickingUI(pointer) {
        // Check if the click is on UI elements (shop button, back button, etc.)
        const x = pointer.x;
        const y = pointer.y;

        // Check shop button
        if (this.shopButton && this.shopButton.x - 50 <= x && x <= this.shopButton.x + 50 &&
            this.shopButton.y - 20 <= y && y <= this.shopButton.y + 20) {
            return true;
        }

        // Check back button
        if (this.backButton && this.backButton.x - 65 <= x && x <= this.backButton.x + 65 &&
            this.backButton.y - 22 <= y && y <= this.backButton.y + 22) {
            return true;
        }

        // Check music button
        if (this.musicButton && this.musicButton.x - 25 <= x && x <= this.musicButton.x + 25 &&
            this.musicButton.y - 25 <= y && y <= this.musicButton.y + 25) {
            return true;
        }

        // Check if start screen is visible
        if (this.startOverlay && this.startOverlay.active) {
            return true;
        }

        // Check if shop is open
        if (this.shopOverlay && this.shopOverlay.active) {
            return true;
        }

        // Check color buttons
        if (this.colorButtons && this.colorButtons.length > 0) {
            for (let btnData of this.colorButtons) {
                if (btnData.button && btnData.button.active) {
                    const bounds = btnData.button.getBounds();
                    if (bounds && x >= bounds.x && x <= bounds.x + bounds.width &&
                        y >= bounds.y && y <= bounds.y + bounds.height) {
                        return true;
                    }
                }
                if (btnData.label && btnData.label.active) {
                    const bounds = btnData.label.getBounds();
                    if (bounds && x >= bounds.x && x <= bounds.x + bounds.width &&
                        y >= bounds.y && y <= bounds.y + bounds.height) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    setColorByCode(code) {
        if (this.gameOver) return;
        // Allow color change even if game hasn't started yet
        const colorIndex = this.colors.findIndex(c => c.code === code);
        if (colorIndex !== -1) {
            this.playerColorIndex = colorIndex;
            this.updateRunnerColor();
            this.updateColorButtons();
            this.add.tween({
                targets: this.runner,
                scale: { from: 1.05, to: 1 },
                duration: 140
            });
        }
    }

    cycleColor() {
        if (this.gameOver || !this.gameStarted) return;
        this.playerColorIndex = (this.playerColorIndex + 1) % this.colors.length;
        this.updateRunnerColor();
        this.updateColorButtons();
        this.add.tween({
            targets: this.runner,
            scale: { from: 1.05, to: 1 },
            duration: 140
        });
    }

    updateColorButtons() {
        if (!this.colorButtons || this.colorButtons.length === 0) return;

        this.colorButtons.forEach((btnData, index) => {
            if (index === this.playerColorIndex) {
                // Highlight selected button with enhanced effects - keep button's own color
                btnData.button.setStrokeStyle(5, this.colors[index].value, 1.0); // Keep button's own color even when selected
                btnData.button.setScale(1.15);
                if (btnData.shadow) btnData.shadow.setScale(1.15);
                if (btnData.glow) {
                    btnData.glow.setAlpha(0.6);
                    btnData.glow.setScale(1.2);
                }
                btnData.label.setTint(this.colors[this.playerColorIndex].value); // Color matches button for selected
                btnData.label.setScale(1.1);
            } else {
                // Reset other buttons
                btnData.button.setStrokeStyle(4, this.colors[index].value, 1.0); // Outline color matches button color
                btnData.button.setScale(1.0);
                if (btnData.shadow) btnData.shadow.setScale(1.0);
                if (btnData.glow) {
                    btnData.glow.setAlpha(0.3);
                    btnData.glow.setScale(1.0);
                }
                btnData.label.clearTint();
                btnData.label.setScale(1.0);
            }
        });
    }

    updateRunnerColor() {
        const color = this.colors[this.playerColorIndex];
        const skin = this.skins[this.selectedSkin];

        if (skin.type === 'circle') {
            this.runner.setFillStyle(color.value);
            this.runner.setStrokeStyle(4, 0xffffff, 0.9);
        } else if (skin.type === 'triangle') {
            // Recreate triangle texture with new color
            if (this.textures.exists('runner-triangle')) {
                this.textures.remove('runner-triangle');
            }
            const gfx = this.make.graphics({ add: false });
            gfx.fillStyle(color.value);
            gfx.lineStyle(4, 0xffffff, 0.9);
            gfx.beginPath();
            gfx.moveTo(0, -24);
            gfx.lineTo(-20, 20);
            gfx.lineTo(20, 20);
            gfx.closePath();
            gfx.fillPath();
            gfx.strokePath();
            gfx.generateTexture('runner-triangle', 48, 48);
            gfx.destroy();
            this.runner.setTexture('runner-triangle');
        } else if (skin.type === 'star') {
            // Recreate star texture with new color
            if (this.textures.exists('runner-star')) {
                this.textures.remove('runner-star');
            }
            const gfx = this.make.graphics({ add: false });
            gfx.fillStyle(color.value);
            gfx.lineStyle(4, 0xffffff, 0.9);
            const points = 5;
            const outerRadius = 24;
            const innerRadius = 12;
            gfx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / points - Math.PI / 2;
                const px = Math.cos(angle) * radius;
                const py = Math.sin(angle) * radius;
                if (i === 0) gfx.moveTo(px, py);
                else gfx.lineTo(px, py);
            }
            gfx.closePath();
            gfx.fillPath();
            gfx.strokePath();
            gfx.generateTexture('runner-star', 48, 48);
            gfx.destroy();
            this.runner.setTexture('runner-star');
        } else {
            // Default rectangle
            this.runner.setFillStyle(color.value);
            this.runner.setStrokeStyle(4, 0xffffff, 0.9);
        }
    }

    scheduleGates() {
        this.gateTimer = this.time.addEvent({
            delay: 1300,
            loop: true,
            callback: () => {
                this.spawnGate();
            }
        });
    }

    spawnGate() {
        if (this.gameOver || !this.gameStarted) return;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const gateColorIndex = Phaser.Math.Between(0, this.colors.length - 1);
        const colorInfo = this.colors[gateColorIndex];
        const gateY = Phaser.Math.Interpolation.Linear([this.trackBottom, this.trackTop], gateColorIndex / (this.colors.length - 1));

        // Responsive gate size
        const gateWidth = this.isMobile ? Math.max(70, 100 * this.scaleFactor) : 100;
        const gateHeight = this.isMobile ? Math.max(50, 70 * this.scaleFactor) : 70;
        const gateStroke = this.isMobile ? 3 : 4;
        const gate = this.add.rectangle(width + 60, gateY, gateWidth, gateHeight, colorInfo.value, 0.6)
            .setStrokeStyle(gateStroke, 0xffffff, 0.9)
            .setDepth(-2);
        gate.colorIndex = gateColorIndex;
        gate.passed = false;
        this.physics.add.existing(gate);
        gate.body.setAllowGravity(false);
        gate.body.setVelocityX(-this.speed);
        gate.body.setImmovable(true);
        gate.body.setSize(gateWidth, gateHeight);
        this.gates.add(gate);

        this.addGateText(gate, colorInfo.code);
    }

    addGateText(gate, label) {
        // Display color code (C, M, L, A) instead of full name
        const text = this.add.text(gate.x, gate.y, label, {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        gate.label = text;
    }

    handleGatePass(player, gate) {
        if (this.gameOver || !gate || gate.passed) return;

        // Mark as passed immediately to prevent multiple triggers
        gate.passed = true;

        if (gate.colorIndex === this.playerColorIndex) {
            // Speed is now increased by distance, not by gate matches
            if (gate.label) gate.label.setText('MATCH!');
            this.flashRunner('#7dff5d');
            if (window.soundManager) window.soundManager.playMatch();
        } else {
            // Still decrease speed on miss
            this.speed = Math.max(320, this.speed - 30);
            if (gate.label) gate.label.setText('MISS');
            this.flashRunner('#ff477e');
            if (window.soundManager) window.soundManager.playMiss();
        }

        // Update UI immediately
        this.updateUI();

        this.time.delayedCall(80, () => {
            if (gate && gate.active) {
                gate.destroy();
                if (gate.label) gate.label.destroy();
            }
        });
    }

    flashRunner(colorHex) {
        const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
        this.tweens.add({
            targets: this.runner,
            strokeColor: color,
            duration: 140,
            yoyo: true
        });
    }


    update(time, delta) {
        // Update shop scrolling on mobile
        if (this.isMobile && this.shopOverlay && this.shopItems && this.shopItems.length > 0) {
            const scrollY = this.shopScrollY || 0;
            this.shopItems.forEach(item => {
                if (item.cardBg && item.cardBg.active) {
                    const newY = item.baseY + scrollY;
                    item.cardBg.setY(newY);
                    if (item.skinDisplay) item.skinDisplay.setY(newY);
                    if (item.status) item.status.setY(newY);
                    if (item.errorText && item.errorText.active) {
                        item.errorText.setY(newY + 40);
                    }
                }
            });
        }

        if (this.gameOver || !this.gameStarted) return;
        const dt = delta / 1000;
        this.distance += this.speed * dt * 0.1;

        // Award coins every 500m
        if (this.distance >= this.lastCoinDistance + 500) {
            this.lastCoinDistance = Math.floor(this.distance / 500) * 500;
            this.awardCoin();
        }

        // Increase speed every 1000m
        if (this.distance >= this.lastSpeedIncreaseDistance + 1000) {
            this.lastSpeedIncreaseDistance = Math.floor(this.distance / 1000) * 1000;
            this.increaseSpeed();
        }

        this.updateUI();

        this.gates.children.each(gate => {
            if (gate.label) {
                gate.label.x = gate.x;
                gate.label.y = gate.y;
            }
            gate.body.setVelocityX(-this.speed);
            if (gate.x < -100) {
                if (gate.label) gate.label.destroy();
                gate.destroy();
            }

            // Manual collision detection - check if runner and gate overlap
            if (!gate.passed && gate.active && this.runner && this.runner.active) {
                const defaultRunnerSize = this.isMobile ? Math.max(36, 48 * this.scaleFactor) : 48;
                const runnerX = this.runner.x;
                const runnerY = this.runner.y;
                const runnerW = this.runner.width || defaultRunnerSize;
                const defaultGateW = this.isMobile ? Math.max(70, 100 * this.scaleFactor) : 100;
                const defaultGateH = this.isMobile ? Math.max(50, 70 * this.scaleFactor) : 70;
                const runnerH = this.runner.height || defaultRunnerSize;
                const gateX = gate.x;
                const gateY = gate.y;
                const gateW = gate.width || defaultGateW;
                const gateH = gate.height || defaultGateH;

                // Check if rectangles overlap
                const runnerLeft = runnerX - runnerW / 2;
                const runnerRight = runnerX + runnerW / 2;
                const runnerTop = runnerY - runnerH / 2;
                const runnerBottom = runnerY + runnerH / 2;

                const gateLeft = gateX - gateW / 2;
                const gateRight = gateX + gateW / 2;
                const gateTop = gateY - gateH / 2;
                const gateBottom = gateY + gateH / 2;

                // More lenient collision detection - check if they're close enough
                if (runnerRight >= gateLeft && runnerLeft <= gateRight &&
                    runnerBottom >= gateTop && runnerTop <= gateBottom) {
                    this.handleGatePass(this.runner, gate);
                }
            }

            // Check if gate passed without being matched
            const defaultRunnerSize = this.isMobile ? Math.max(36, 48 * this.scaleFactor) : 48;
            if (!this.gameOver && gate.x < this.runner.x - (this.runner.width || defaultRunnerSize) / 2 && !gate.passed) {
                gate.passed = true;
                if (gate.colorIndex !== this.playerColorIndex) {
                    this.endRun(false);
                }
            }
        });


        this.trail.x = this.runner.x - 20;
        this.trail.y = this.runner.y;

        this.speed = Phaser.Math.Clamp(this.speed, 320, 840);
    }

    updateCoinCounter() {
        // Ensure totalCoins is loaded
        if (typeof this.totalCoins === 'undefined' || this.totalCoins === null) {
            this.totalCoins = this.loadCoins();
        }

        // Update coin counter displays
        if (this.coinText) {
            this.coinText.setText('🪙 ' + this.totalCoins);
        }
        if (this.coinTextTopRight) {
            this.coinTextTopRight.setText('🪙 Coins: ' + this.totalCoins);
        }
    }

    updateUI() {
        // Update highest distance in real-time if current distance exceeds it
        if (this.distance > this.highestDistance) {
            this.highestDistance = this.distance;
            localStorage.setItem('colorDashHighestDistance', this.highestDistance.toString());

            // Show message when beating the previous record (only once per game)
            if (!this.recordBeatenShown && this.distance > this.previousHighestDistance) {
                this.recordBeatenShown = true;
                this.showRecordBeatenMessage();
            }
        }

        // Safely update UI elements if they exist
        if (this.distanceText) {
            this.distanceText.setText('Distance: ' + Math.round(this.distance) + 'm');
        }
        if (this.highestDistanceText) {
            this.highestDistanceText.setText('Best: ' + Math.round(this.highestDistance) + 'm');
        }
        if (this.speedText) {
            this.speedText.setText('Speed: ' + Math.round(this.speed));
        }

        // Update coin counter
        this.updateCoinCounter();
    }

    showRecordBeatenMessage() {
        if (window.soundManager) window.soundManager.playRecord();

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const banner = this.add.text(width / 2, height / 2 - 100, '🏆 You Beat Your Highest Distance! 🏆', {
            fontSize: '24px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(15).setShadow(0, 0, '#ffaa00', 12, true, true);

        // Animate the banner
        this.tweens.add({
            targets: banner,
            scale: { from: 0.8, to: 1.1 },
            duration: 300,
            yoyo: true,
            ease: 'Back.easeOut'
        });

        // Fade out after a few seconds
        this.tweens.add({
            targets: banner,
            alpha: 0,
            y: banner.y - 50,
            duration: 1500,
            delay: 2000,
            ease: 'Sine.easeOut',
            onComplete: () => banner.destroy()
        });
    }

    loadHighestDistance() {
        const saved = localStorage.getItem('colorDashHighestDistance');
        return saved ? parseFloat(saved) : 0;
    }

    saveHighestDistance(distance) {
        if (distance > this.highestDistance) {
            this.highestDistance = distance;
            localStorage.setItem('colorDashHighestDistance', distance.toString());
            return true;
        }
        return false;
    }

    endRun(success) {
        if (this.gameOver) return;
        this.gameOver = true;
        if (this.gateTimer) this.gateTimer.remove(false);

        this.trail.stop();
        this.runner.body.setVelocity(0);

        // Music continues playing during game over screen
        if (window.soundManager) window.soundManager.playGameOver();

        // Save highest distance
        const isNewRecord = this.saveHighestDistance(this.distance);

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Responsive game over screen
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.46).setDepth(20);
        const cardWidth = this.isMobile ? width * 0.85 : width * 0.6;
        const cardHeight = this.isMobile ? Math.max(220, 280 * this.scaleFactor) : 280;
        const card = this.add.rectangle(width / 2, height / 2, cardWidth, cardHeight, 0x041029, 0.92)
            .setDepth(21)
            .setStrokeStyle(2, 0x5dd5ff, 0.8);
        const title = success ? 'Dash Complete!' : 'Game Over';
        const subtitle = success
            ? 'You conquered the color sprint!' : 'A wrong hue clipped your stride...';

        const titleFontSize = this.isMobile ? Math.max(28, 42 * this.scaleFactor) : 42;
        const titleY = height / 2 - (this.isMobile ? 45 : 70);
        this.add.text(width / 2, titleY, title, {
            fontSize: titleFontSize + 'px',
            fill: '#d9f7ff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(22).setShadow(0, 0, '#0b7ed1', 16, true, true);

        const subtitleY = height / 2 - (this.isMobile ? 12 : 20);
        if (isNewRecord) {
            const recordFontSize = this.isMobile ? Math.max(18, 24 * this.scaleFactor) : 24;
            this.add.text(width / 2, subtitleY, '🏆 NEW RECORD! 🏆', {
                fontSize: recordFontSize + 'px',
                fill: '#ffd700',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(22).setShadow(0, 0, '#ffaa00', 12, true, true);
        } else {
            const subtitleFontSize = this.isMobile ? Math.max(16, 20 * this.scaleFactor) : 20;
            this.add.text(width / 2, subtitleY, subtitle, {
                fontSize: subtitleFontSize + 'px',
                fill: '#b5e9ff',
                fontFamily: 'Arial',
                align: 'center',
                wordWrap: { width: cardWidth * (this.isMobile ? 0.85 : 0.9) }
            }).setOrigin(0.5).setDepth(22);
        }

        const statsFontSize = this.isMobile ? Math.max(14, 18 * this.scaleFactor) : 18;
        const statsY = height / 2 + (this.isMobile ? 20 : 30);
        this.add.text(width / 2, statsY, `Distance: ${Math.round(this.distance)}m  •  Best: ${Math.round(this.highestDistance)}m`, {
            fontSize: statsFontSize + 'px',
            fill: '#8ad8ff',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: cardWidth * (this.isMobile ? 0.85 : 0.9) }
        }).setOrigin(0.5).setDepth(22);

        if (this.coinsCollected > 0) {
            const coinCollectedFontSize = this.isMobile ? Math.max(14, 18 * this.scaleFactor) : 18;
            const coinCollectedY = height / 2 + (this.isMobile ? 45 : 60);
            this.add.text(width / 2, coinCollectedY, `🪙 Collected: ${this.coinsCollected} coins`, {
                fontSize: coinCollectedFontSize + 'px',
                fill: '#ffd700',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            }).setOrigin(0.5).setDepth(22).setShadow(0, 0, '#ffaa00', 10, true, true);
        }

        // Responsive buttons
        const buttonWidth = this.isMobile ? Math.max(140, 190 * this.scaleFactor) : 190;
        const buttonHeight = this.isMobile ? Math.max(40, 50 * this.scaleFactor) : 50;
        const buttonSpacing = this.isMobile ? Math.max(80, 120 * this.scaleFactor) : 120;
        const buttonY = height / 2 + (this.isMobile ? 70 : 90);
        const playAgain = this.add.rectangle(width / 2 - (buttonSpacing / 2), buttonY, buttonWidth, buttonHeight, 0x0a4d6f, 0.95)
            .setDepth(22)
            .setStrokeStyle(2, 0xffffff, 0.9)
            .setInteractive({ useHandCursor: true });
        const playTextFontSize = this.isMobile ? Math.max(16, 20 * this.scaleFactor) : 20;
        const playText = this.add.text(playAgain.x, playAgain.y, 'Play Again', {
            fontSize: playTextFontSize + 'px',
            fill: '#d9f7ff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(23);
        playAgain.on('pointerdown', () => {
            if (window.soundManager) window.soundManager.playClick();
            this.scene.restart();
        });
        playText.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (window.soundManager) window.soundManager.playClick();
                playAgain.emit('pointerdown');
            });

        const menuButton = this.add.rectangle(width / 2 + (buttonSpacing / 2), buttonY, buttonWidth, buttonHeight, 0x083551, 0.95)
            .setDepth(22)
            .setStrokeStyle(2, 0xffffff, 0.9)
            .setInteractive({ useHandCursor: true });
        const menuText = this.add.text(menuButton.x, menuButton.y, 'Back to Menu', {
            fontSize: playTextFontSize + 'px',
            fill: '#d9f7ff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(23);
        const goBack = () => {
            if (typeof window !== 'undefined' && typeof window.returnToMenu === 'function') {
                window.returnToMenu();
            } else {
                this.scene.stop();
            }
        };
        menuButton.on('pointerdown', () => {
            if (window.soundManager) window.soundManager.playClick();
            goBack();
        });
        menuText.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (window.soundManager) window.soundManager.playClick();
                goBack();
            });
    }

    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        this.trackTop = height * 0.25;
        this.trackBottom = height * 0.78;
        this.trackWidth = width * 0.7;
        this.runner.setPosition(width * 0.28, (this.trackTop + this.trackBottom) / 2);
        this.leafGlow?.setPosition(this.runner.x, this.runner.y);

        this.bgImage.setSize(width + 160, height);
        this.distanceText.setPosition(width - 40, 32);
        this.highestDistanceText.setPosition(width - 40, 66);
        this.speedText.setPosition(width - 40, 100);
        this.instructionBar.setPosition(width / 2, height - 42);
        this.instructionBar.setSize(width * 0.9, 90);
        this.instructions.setPosition(width / 2, height - 70);
        if (this.coinInstructions) {
            this.coinInstructions.setPosition(width / 2, height - 40);
        }
        this.controlsHint.setPosition(width / 2, height - 15);
        this.backButton.setPosition(30, height - 100);
        this.backLabel.setPosition(30 + 65, height - 100);
        if (this.musicButton) {
            this.musicButton.setPosition(width - 40, height - 100);
            this.musicIcon.setPosition(width - 40, height - 100);
        }
        this.foregroundLight.setPosition(width / 2, this.trackBottom + 26);
        this.foregroundLight.width = this.trackWidth;
        this.foregroundLight.setDisplaySize(this.trackWidth, 50);
        if (this.coinBg) {
            this.coinBg.setPosition(40, 32);
        }
        if (this.coinText) {
            this.coinText.setPosition(40 + 70, 32 + 17.5);
        }
        if (this.coinTextTopRight) {
            this.coinTextTopRight.setPosition(width - 40, 134);
        }
        if (this.shopButton) {
            this.shopButton.setPosition(40, 80);
            this.shopLabel.setPosition(40 + 50, 80);
        }
    }

    // Coin and skin management
    loadCoins() {
        const saved = localStorage.getItem('colorDashCoins');
        return saved ? parseInt(saved, 10) : 0;
    }

    saveCoins(coins) {
        localStorage.setItem('colorDashCoins', coins.toString());
    }

    loadSelectedSkin() {
        const saved = localStorage.getItem('colorDashSelectedSkin');
        return saved || 'default';
    }

    saveSelectedSkin(skinId) {
        localStorage.setItem('colorDashSelectedSkin', skinId);
    }

    initializeSkins() {
        return {
            'default': { id: 'default', name: 'Square', type: 'rectangle', price: 0, owned: true, icon: '⬜' },
            'circle': { id: 'circle', name: 'Circle', type: 'circle', price: 50, owned: this.isSkinOwned('circle'), icon: '⭕' },
            'triangle': { id: 'triangle', name: 'Triangle', type: 'triangle', price: 100, owned: this.isSkinOwned('triangle'), icon: '🔺' },
            'star': { id: 'star', name: 'Star', type: 'star', price: 200, owned: this.isSkinOwned('star'), icon: '⭐' }
        };
    }

    isSkinOwned(skinId) {
        const owned = localStorage.getItem('colorDashOwnedSkins');
        if (!owned) return false;
        const ownedList = JSON.parse(owned);
        return ownedList.includes(skinId);
    }

    unlockSkin(skinId) {
        const owned = localStorage.getItem('colorDashOwnedSkins');
        let ownedList = owned ? JSON.parse(owned) : [];
        if (!ownedList.includes(skinId)) {
            ownedList.push(skinId);
            localStorage.setItem('colorDashOwnedSkins', JSON.stringify(ownedList));
        }
    }

    showShop() {
        if (this.shopOverlay) return; // Shop already open

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create animated gradient overlay background
        // Simple dark overlay
        this.shopOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setDepth(30)
            .setInteractive();

        // Shop panel with SIMPLE BLUE BACKGROUND
        const panelWidth = this.isMobile ? width * 0.9 : width * 0.7;
        const panelHeight = this.isMobile ? Math.min(height * 0.85, height * 0.9) : height * 0.7;

        // Simple blue background rectangle
        this.shopPanelBg = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x1e3a8a, 1);
        this.shopPanelBg.setDepth(31);
        this.shopPanelBg.setStrokeStyle(4, 0xffd700);

        // Remove old complex graphics setup logic (to be deleted in next steps)
        const panelX = 0; // Unused
        const panelY = 0; // Unused
        // this.shopBackgroundPattern replaced
        // Complex graphics removed


        // Create an invisible Zone for the panel to handle input and store data
        // This effectively replaces the old Image but keeps the logic working
        this.shopPanel = this.add.zone(width / 2, height / 2, panelWidth, panelHeight)
            .setDepth(31)
            .setInteractive(); // Blocks clicks from passing through
        this.shopPanel.setData('isZone', true);



        // Add glowing border effect
        const borderGlow = this.add.graphics();
        borderGlow.lineStyle(4, 0xffd700, 0.9);
        borderGlow.strokeRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 20);
        borderGlow.setDepth(31.5);

        // Add inner glow effect
        const innerGlow = this.add.graphics();
        innerGlow.lineStyle(2, 0xd4a8ff, 0.5);
        innerGlow.strokeRoundedRect(width / 2 - panelWidth / 2 + 2, height / 2 - panelHeight / 2 + 2, panelWidth - 4, panelHeight - 4, 18);
        innerGlow.setDepth(31.6);

        // Store border elements for cleanup
        const shopBorderElements = [borderGlow, innerGlow];

        // Make shop panel scrollable on mobile
        if (this.isMobile) {
            this.shopIsScrolling = false;
            this.shopScrollY = 0;
            this.shopLastTouchY = 0;

            // Enable touch scrolling on the shop panel area
            this.shopPanel.setInteractive(new Phaser.Geom.Rectangle(
                width / 2 - panelWidth / 2,
                height / 2 - panelHeight / 2,
                panelWidth,
                panelHeight
            ), Phaser.Geom.Rectangle.Contains);

            // Also make border elements non-interactive
            shopBorderElements.forEach(elem => elem.setInteractive(false));

            // Touch start
            this.shopPanel.on('pointerdown', (pointer) => {
                this.shopIsScrolling = true;
                this.shopLastTouchY = pointer.y;
            });

            // Touch move (scrolling) - use a separate handler to avoid conflicts
            const shopPanel = this.shopPanel;
            this.input.on('pointermove', (pointer) => {
                if (this.shopIsScrolling && pointer.isDown && this.shopOverlay) {
                    // Check if pointer is still over shop panel
                    const pointerX = pointer.x;
                    const pointerY = pointer.y;
                    const panelLeft = width / 2 - panelWidth / 2;
                    const panelRight = width / 2 + panelWidth / 2;
                    const panelTop = height / 2 - panelHeight / 2;
                    const panelBottom = height / 2 + panelHeight / 2;

                    if (pointerX >= panelLeft && pointerX <= panelRight &&
                        pointerY >= panelTop && pointerY <= panelBottom) {
                        const deltaY = pointer.y - this.shopLastTouchY;
                        this.shopLastTouchY = pointer.y;

                        // Calculate scroll bounds
                        const scrollAreaHeight = panelHeight - (this.isMobile ? 160 : 200);
                        const contentHeight = skinIds.length * skinSpacing + 40;
                        const maxScroll = Math.max(0, contentHeight - scrollAreaHeight);

                        // Update scroll position
                        this.shopScrollY = Phaser.Math.Clamp(this.shopScrollY + deltaY, -maxScroll, 0);
                    }
                }
            });

            // Touch end
            this.input.on('pointerup', () => {
                this.shopIsScrolling = false;
            });
        }

        // Title (responsive)
        const shopTitleFontSize = this.isMobile ? Math.max(24, 36 * this.scaleFactor) : 36;
        const shopTitleY = height / 2 - panelHeight / 2 + (this.isMobile ? 30 : 40);
        const titleText = this.add.text(width / 2, shopTitleY, '🛍️ Skin Shop', {
            fontSize: shopTitleFontSize + 'px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(32).setShadow(0, 0, '#ffaa00', 15, true, true);

        // Coins display (responsive)
        const shopCoinFontSize = this.isMobile ? Math.max(18, 24 * this.scaleFactor) : 24;
        const shopCoinY = height / 2 - panelHeight / 2 + (this.isMobile ? 60 : 80);
        const coinDisplay = this.add.text(width / 2, shopCoinY, `🪙 Coins: ${this.totalCoins}`, {
            fontSize: shopCoinFontSize + 'px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(32);
        this.shopPanel.setData('coinDisplay', coinDisplay);

        // Store all shop children for cleanup
        const shopChildren = [titleText, coinDisplay, ...shopBorderElements];

        // Skin list
        const skinIds = Object.keys(this.skins);
        const startY = height / 2 - panelHeight / 2 + 140;
        // Responsive shop item sizing
        const skinSpacing = this.isMobile ? Math.max(60, 80 * this.scaleFactor) : 80;
        const cardWidth = this.isMobile ? Math.max(200, 300 * this.scaleFactor) : 300;
        const cardHeight = this.isMobile ? Math.max(45, 60 * this.scaleFactor) : 60;
        const cardX = width / 2 - (cardWidth / 2);

        skinIds.forEach((skinId, index) => {
            const skin = this.skins[skinId];
            const baseY = startY + index * skinSpacing;

            // Create attractive gradient card background
            const isSelected = this.selectedSkin === skinId;
            const cardGradient = this.add.graphics();
            if (isSelected) {
                // Selected card: vibrant purple-pink gradient
                cardGradient.fillGradientStyle(0x7c3aed, 0x7c3aed, 0xec4899, 0xec4899, 0.95);
            } else {
                // Unselected card: blue-purple gradient
                cardGradient.fillGradientStyle(0x3b82f6, 0x3b82f6, 0x6366f1, 0x6366f1, 0.9);
            }
            cardGradient.fillRoundedRect(0, 0, cardWidth, cardHeight, 12);
            cardGradient.generateTexture(`shop-card-${skinId}`, cardWidth, cardHeight);
            cardGradient.destroy();

            // Skin card with gradient background
            const cardBg = this.add.image(cardX + cardWidth / 2, baseY, `shop-card-${skinId}`)
                .setDepth(32)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            // Add glowing border for selected cards
            if (isSelected) {
                const selectedGlow = this.add.graphics();
                selectedGlow.lineStyle(3, 0xffd700, 1.0);
                selectedGlow.strokeRoundedRect(cardX, baseY - cardHeight / 2, cardWidth, cardHeight, 12);
                selectedGlow.setDepth(32.5);
                shopChildren.push(selectedGlow);

                // Add pulsing glow animation
                this.tweens.add({
                    targets: selectedGlow,
                    alpha: { from: 0.6, to: 1.0 },
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else {
                // Subtle border for unselected cards
                const cardBorder = this.add.graphics();
                cardBorder.lineStyle(2, 0x5dd5ff, 0.6);
                cardBorder.strokeRoundedRect(cardX, baseY - cardHeight / 2, cardWidth, cardHeight, 12);
                cardBorder.setDepth(32.5);
                shopChildren.push(cardBorder);
            }

            // Skin icon and name (responsive)
            const skinDisplayFontSize = this.isMobile ? Math.max(16, 20 * this.scaleFactor) : 20;
            const skinDisplay = this.add.text(cardX, baseY, `${skin.icon} ${skin.name}`, {
                fontSize: skinDisplayFontSize + 'px',
                fill: '#d9f7ff',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            }).setOrigin(0.5).setDepth(33);

            // Price or status
            let statusText = '';
            let statusColor = '#8ad8ff';
            if (skin.owned) {
                if (this.selectedSkin === skinId) {
                    statusText = '✓ Selected';
                    statusColor = '#7dff5d';
                } else {
                    statusText = '✓ Owned';
                    statusColor = '#7dff5d';
                }
            } else {
                statusText = `🪙 ${skin.price}`;
                statusColor = '#ffd700';
            }

            // Price or status (responsive)
            const statusFontSize = this.isMobile ? Math.max(14, 18 * this.scaleFactor) : 18;
            const statusX = this.isMobile ? (width / 2 + cardWidth / 2 - 50) : (width / 2 + 100);
            const status = this.add.text(statusX, baseY, statusText, {
                fontSize: statusFontSize + 'px',
                fill: statusColor,
                fontFamily: 'Arial',
                fontWeight: 'bold'
            }).setOrigin(0.5).setDepth(33);

            // Card click handler
            const handleCardClick = () => {
                if (window.soundManager) window.soundManager.playClick();

                if (skin.owned) {
                    // Select skin
                    this.selectedSkin = skinId;
                    this.saveSelectedSkin(skinId);
                    this.closeShop();
                    // Restart to apply new skin
                    this.scene.restart();
                } else if (this.totalCoins >= skin.price) {
                    // Purchase skin
                    this.totalCoins -= skin.price;
                    this.saveCoins(this.totalCoins);
                    this.unlockSkin(skinId);
                    skin.owned = true;
                    status.setText('✓ Owned');
                    status.setFill('#7dff5d');
                    if (this.coinText) {
                        this.coinText.setText('🪙 ' + this.totalCoins);
                    }
                    if (this.coinTextTopRight) {
                        this.coinTextTopRight.setText('🪙 Coins: ' + this.totalCoins);
                    }
                    // Update coins display in shop
                    const coinDisplay = this.shopPanel.getData('coinDisplay');
                    if (coinDisplay) {
                        coinDisplay.setText(`🪙 Coins: ${this.totalCoins}`);
                    }
                    if (window.soundManager) window.soundManager.playMatch();
                } else {
                    // Not enough coins
                    if (window.soundManager) window.soundManager.playMiss();
                    const errorText = this.add.text(width / 2, baseY + 40, 'Not enough coins!', {
                        fontSize: '16px',
                        fill: '#ff477e',
                        fontFamily: 'Arial',
                        fontWeight: 'bold'
                    }).setOrigin(0.5).setDepth(34);
                    this.tweens.add({
                        targets: errorText,
                        alpha: 0,
                        y: errorText.y - 20,
                        duration: 1000,
                        onComplete: () => errorText.destroy()
                    });

                    // Store error text for scrolling
                    if (this.isMobile && this.shopItems && this.shopItems[index]) {
                        this.shopItems[index].errorText = errorText;
                    }
                }
            };

            // Add hover effects to cards
            cardBg.on('pointerover', () => {
                this.tweens.add({
                    targets: cardBg,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 200,
                    ease: 'Back.easeOut'
                });
            });
            cardBg.on('pointerout', () => {
                this.tweens.add({
                    targets: cardBg,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 200,
                    ease: 'Back.easeIn'
                });
            });

            cardBg.on('pointerdown', handleCardClick);
            skinDisplay.setInteractive({ useHandCursor: true }).on('pointerdown', handleCardClick);
            status.setInteractive({ useHandCursor: true }).on('pointerdown', handleCardClick);

            shopChildren.push(cardBg, skinDisplay, status);

            // Store items for scrolling on mobile
            if (this.isMobile) {
                if (!this.shopItems) this.shopItems = [];
                this.shopItems.push({
                    cardBg,
                    skinDisplay,
                    status,
                    baseY,
                    errorText: null
                });
            }
        });

        // Close button with attractive gradient
        const closeBtnGradient = this.add.graphics();
        closeBtnGradient.fillGradientStyle(0xec4899, 0xec4899, 0xf97316, 0xf97316, 0.95);
        closeBtnGradient.fillRoundedRect(0, 0, 150, 50, 12);
        closeBtnGradient.generateTexture('shop-close-btn', 150, 50);
        closeBtnGradient.destroy();
        const closeButton = this.add.image(width / 2, height / 2 + panelHeight / 2 - 40, 'shop-close-btn')
            .setDepth(32)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // Add glowing border to close button
        const closeBtnBorder = this.add.graphics();
        closeBtnBorder.lineStyle(2, 0xffffff, 0.9);
        closeBtnBorder.strokeRoundedRect(width / 2 - 75, height / 2 + panelHeight / 2 - 65, 150, 50, 12);
        closeBtnBorder.setDepth(32.5);
        shopChildren.push(closeBtnBorder);

        // Add hover effect
        closeButton.on('pointerover', () => {
            this.tweens.add({ targets: closeButton, scaleX: 1.1, scaleY: 1.1, duration: 200 });
        });
        closeButton.on('pointerout', () => {
            this.tweens.add({ targets: closeButton, scaleX: 1, scaleY: 1, duration: 200 });
        });
        const closeText = this.add.text(width / 2, height / 2 + panelHeight / 2 - 40, 'Close', {
            fontSize: '20px',
            fill: '#d9f7ff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(33);

        const closeShop = () => {
            if (window.soundManager) window.soundManager.playClick();
            this.closeShop();
        };

        closeButton.on('pointerdown', closeShop);
        closeText.setInteractive({ useHandCursor: true }).on('pointerdown', closeShop);
        this.shopOverlay.on('pointerdown', closeShop);

        shopChildren.push(closeButton, closeText);
        this.shopPanel.setData('children', shopChildren);
    }


    closeShop() {
        // Destroy all shop-related objects
        if (this.shopOverlay) {
            this.shopOverlay.destroy();
            this.shopOverlay = null;
        }

        // Destroy gradient overlay and tween
        if (this.shopGradientOverlay) {
            this.shopGradientOverlay.destroy();
            this.shopGradientOverlay = null;
        }
        if (this.shopGradientTween) {
            this.shopGradientTween.remove();
            this.shopGradientTween = null;
        }

        // Destroy panel gradient and tween
        if (this.shopPanelGradient) {
            this.shopPanelGradient.destroy();
            this.shopPanelGradient = null;
        }
        if (this.shopPanelGradientTween) {
            this.shopPanelGradientTween.remove();
            this.shopPanelGradientTween = null;
        }

        // Destroy stripe background pattern and overlay
        if (this.shopBackgroundPattern) {
            this.shopBackgroundPattern.destroy();
            this.shopBackgroundPattern = null;
        }
        if (this.shopPanelOverlay) {
            this.shopPanelOverlay.destroy();
            this.shopPanelOverlay = null;
        }
        if (this.shopStripeTween) {
            this.shopStripeTween.remove();
            this.shopStripeTween = null;
        }

        // Destroy sparkles
        if (this.shopSparkles) {
            this.shopSparkles.destroy();
            this.shopSparkles = null;
        }

        // Destroy floating coins
        if (this.shopFloatingCoins) {
            this.shopFloatingCoins.forEach(coin => {
                if (coin && coin.active) coin.destroy();
            });
            this.shopFloatingCoins = null;
        }

        // Destroy floating stars
        if (this.shopFloatingStars) {
            this.shopFloatingStars.forEach(star => {
                if (star && star.active) star.destroy();
            });
            this.shopFloatingStars = null;
        }

        // Destroy simple blue background
        if (this.shopPanelBg) {
            this.shopPanelBg.destroy();
            this.shopPanelBg = null;
        }

        if (this.shopPanel) {
            // Destroy all children of the shop panel
            const children = this.shopPanel.getData('children') || [];
            children.forEach(child => {
                if (child && child.active) {
                    child.destroy();
                }
            });
            this.shopPanel.destroy(true);
            this.shopPanel = null;
        }

        // Clean up texture cache
        if (this.textures.exists('shop-overlay-bg')) {
            this.textures.remove('shop-overlay-bg');
        }
        if (this.textures.exists('shop-panel-bg')) {
            this.textures.remove('shop-panel-bg');
        }
        if (this.textures.exists('shop-close-btn')) {
            this.textures.remove('shop-close-btn');
        }
        if (this.textures.exists('shop-coin')) {
            this.textures.remove('shop-coin');
        }
        if (this.textures.exists('shop-star')) {
            this.textures.remove('shop-star');
        }

        // Clean up card textures
        const skinIds = Object.keys(this.skins);
        skinIds.forEach(skinId => {
            if (this.textures.exists(`shop-card-${skinId}`)) {
                this.textures.remove(`shop-card-${skinId}`);
            }
        });
    }
}

window.ColorDashGame = ColorDashGame;

