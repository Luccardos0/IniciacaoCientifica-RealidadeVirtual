/**
 * AFRAME COMPONENTS REFACTOR
 * Centralização dos componentes customizados e shaders do projeto.
 */

AFRAME.registerComponent('dynamic-trail', {
    schema: {
        targetId: { type: 'string' },
        lerpSpeed: { type: 'number', default: 0.5 },
        offset: { type: 'vec3', default: { x: 0, y: 0, z: 0 } }
    },
    init: function () {
        this.targetElement = null;
        this.targetPos = new THREE.Vector3();
    },
    tick: function () {
        if (!this.targetElement) {
            this.targetElement = document.querySelector('#' + this.data.targetId);
            return;
        }
        if (!this.targetElement.object3D) return;
        this.targetElement.object3D.getWorldPosition(this.targetPos);
        this.targetPos.add(this.data.offset);
        this.el.object3D.position.lerp(this.targetPos, this.data.lerpSpeed);
    }
});

AFRAME.registerComponent('dt', {
    schema: { target: { type: 'string' }, speed: { type: 'number', default: 0.3 }, off: { type: 'vec3' } },
    init: function () { this.v = new THREE.Vector3(); },
    tick: function () {
        if (!this.elT) { this.elT = document.querySelector('#' + this.data.target); return; }
        if (!this.elT.object3D) return; 
        this.v.copy(this.elT.object3D.position).add(this.data.off);
        this.el.object3D.position.lerp(this.v, this.data.speed);
    }
});

AFRAME.registerShader('grad', {
    schema: { c: { type: 'color', is: 'uniform' } },
    vertexShader: `
        varying vec2 v; 
        void main(){ 
            v = uv; 
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
        }`,
    fragmentShader: `
        varying vec2 v; 
        uniform vec3 c; 
        void main(){ 
            gl_FragColor = vec4(c, 1.0 - v.y); 
        }`
});

// Shader de degradê vertical do Céu (Espaço -> Atmosfera)
AFRAME.registerShader('sky-gradient', {
    schema: {
        topColor: { type: 'color', default: '#020208', is: 'uniform' },
        bottomColor: { type: 'color', default: '#4a90e2', is: 'uniform' },
        offset: { type: 'float', default: 400.0, is: 'uniform' },
        exponent: { type: 'float', default: 0.6, is: 'uniform' }
    },
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
    `
});

/**
 * COMPONENTE: PAINEL EXPLICATIVO INTERATIVO VR (MODAL POP-UP FRONTAL)
 */
AFRAME.registerComponent('painel-explicativo', {
    schema: {
        cenaAtual: { type: 'number', default: 1 }
    },

    init: function () {
        this.textos = {
            1: [
                "PÁGINA 1/2\nRaios cosmicos de alta energia colidem com gases na alta atmosfera terrestre. A colisao gera uma cascata de particulas secundarias em direcao ao solo. ",
                "PÁGINA 2/2\nNesta cena observamos a origem dos pions de primeira geracao. A simulacao mostra a chegada aleatoria e distribuida dessas particulas na Terra."
            ],
            2: [
                "PÁGINA 1/2\nOs pions gerados na alta atmosfera sao instaveis e decaem rapidamente. Esse decaimento origina os muons e neutrinos de segunda geracao.",
                "PÁGINA 2/2\nPela fisica classica o tempo de vida curto dos muons impediria sua chegada ao solo. A trajetoria tracejada permite visualizar cada etapa do decaimento."
            ],
            3: [
                "PÁGINA 1/2\nA quantidade de muons incidentes depende da energia dos raios cosmicos na atmosfera. O tempo de meia vida proprio do muon e de apenas 2.2 microsegundos.",
                "PÁGINA 2/2\nAlterne no console entre 3 e 6 muons por ciclo para comparar a densidade do fluxo. Observe como a taxa de decaimento varia sobre a superficie do mar."
            ],
            4: [
                "PÁGINA 1/2\nNo referencial de repouso do muon a atmosfera se move em sua direcao. Sem a TRR o tempo proprio de 2.2 microsegundos acaba e o muon decai no ar.",
                "PÁGINA 2/2\nCom a TRR ativa ocorre a contracao do comprimento da atmosfera. A distancia encurtada permite que a superficie da Terra atinja o muon antes do decaimento."
            ],
            5: [
                "PÁGINA 1/2\nNo referencial da Terra a atmosfera possui extensoes reais de 10 a 15 km. Sem a TRR o percurso exige tempo excessivo e quase 100% dos muons decaem no ar.",
                "PÁGINA 2/2\nCom a TRR a dilatacao temporal estende a vida util do muon para o observador do solo. A fisica probabilistica permite que cerca de 50% atinjam o detector."
            ]
        };

        this.paginaAtual = 0;
        let idCena = parseInt(this.data.cenaAtual, 10) || 1;
        this.paginasCena = this.textos[idCena] || ["Texto não encontrado."];
        this.rotas = { 1: 'index.html', 2: 'cena2.html', 3: 'cena3.html', 4: 'cena4.html', 5: 'cena5.html' };

        let scene = this.el.sceneEl;
        
        this.modalInfo = scene.querySelector('#modal-leitura-info');
        this.textoEl = scene.querySelector('.texto-conteudo');
        this.btnVoltarTexto = scene.querySelector('.btn-voltar-texto');
        this.btnAvancarTexto = scene.querySelector('.btn-avancar-texto');
        this.btnFecharModal = scene.querySelector('.btn-fechar-modal');

        this.btnToggleInfo = scene.querySelector('.btn-toggle-info');
        this.btnCenaAnterior = scene.querySelector('.btn-cena-anterior');
        this.btnCenaProxima = scene.querySelector('.btn-cena-proxima');
        this.btnToggleTRR3D = scene.querySelector('.btn-toggle-trr-3d');

        this.infoVisivel = false;
        this.estadoFiltro3D = (idCena === 2);

        this.atualizarTexto = this.atualizarTexto.bind(this);
        this.mudarPagina = this.mudarPagina.bind(this);
        this.mudarCena = this.mudarCena.bind(this);
        this.toggleModalInfo = this.toggleModalInfo.bind(this);
        this.toggleFiltro3D = this.toggleFiltro3D.bind(this);

        if (this.btnVoltarTexto) this.btnVoltarTexto.addEventListener('click', () => this.mudarPagina(-1));
        if (this.btnAvancarTexto) this.btnAvancarTexto.addEventListener('click', () => this.mudarPagina(1));
        if (this.btnCenaAnterior) this.btnCenaAnterior.addEventListener('click', () => this.mudarCena(-1));
        if (this.btnCenaProxima) this.btnCenaProxima.addEventListener('click', () => this.mudarCena(1));
        if (this.btnToggleInfo) this.btnToggleInfo.addEventListener('click', this.toggleModalInfo);
        if (this.btnFecharModal) this.btnFecharModal.addEventListener('click', this.toggleModalInfo);
        if (this.btnToggleTRR3D) this.btnToggleTRR3D.addEventListener('click', this.toggleFiltro3D);

        if (idCena === 3) {
            let btn3 = scene.querySelector('.btn-muons-3');
            let btn6 = scene.querySelector('.btn-muons-6');

            const atualizarSelecao3D = (qtd) => {
                let box3 = btn3 ? btn3.querySelector('.bg-btn-3') || btn3.querySelector('a-box') : null;
                let box6 = btn6 ? btn6.querySelector('.bg-btn-6') || btn6.querySelector('a-box') : null;

                if (qtd === 3) {
                    if (box3) box3.setAttribute('material', 'color', '#00FF7F');
                    if (box6) box6.setAttribute('material', 'color', '#9370DB');
                } else {
                    if (box3) box3.setAttribute('material', 'color', '#9370DB');
                    if (box6) box6.setAttribute('material', 'color', '#00FF7F');
                }

                if (typeof setQtdMuonsCena3 === 'function') {
                    setQtdMuonsCena3(qtd);
                }
            };

            if (btn3) btn3.addEventListener('click', () => atualizarSelecao3D(3));
            if (btn6) btn6.addEventListener('click', () => atualizarSelecao3D(6));
        }

        setTimeout(this.atualizarTexto, 50);
    },

    atualizarTexto: function () {
        if (!this.textoEl) {
            this.textoEl = this.el.sceneEl.querySelector('.texto-conteudo');
        }
        if (this.textoEl) {
            this.textoEl.setAttribute('text', 'value', this.paginasCena[this.paginaAtual]);
        }
    },

    toggleModalInfo: function () {
        this.infoVisivel = !this.infoVisivel;
        
        if (this.modalInfo) {
            this.modalInfo.setAttribute('visible', this.infoVisivel);
            if (this.infoVisivel) {
                this.modalInfo.setAttribute('scale', '1 1 1');
            } else {
                this.modalInfo.setAttribute('scale', '0.001 0.001 0.001');
            }
        }

        if (this.btnToggleInfo) {
            let bg = this.btnToggleInfo.querySelector('a-box');
            if (bg) {
                bg.setAttribute('material', 'color', this.infoVisivel ? '#00FF7F' : '#1F3A5F');
            }
        }
    },

    mudarPagina: function (direcao) {
        let novaPagina = this.paginaAtual + direcao;
        if (novaPagina >= 0 && novaPagina < this.paginasCena.length) {
            this.paginaAtual = novaPagina;
            this.atualizarTexto();
        }
    },

    mudarCena: function (direcao) {
        let cenaPura = parseInt(this.data.cenaAtual, 10) || 1;
        let novaCena = cenaPura + direcao;
        
        if (novaCena < 1) novaCena = 5;
        if (novaCena > 5) novaCena = 1;
        
        window.location.href = this.rotas[novaCena];
    },

    toggleFiltro3D: function () {
        this.estadoFiltro3D = !this.estadoFiltro3D;
        let idCena = parseInt(this.data.cenaAtual, 10) || 1;
        let btn3D = this.btnToggleTRR3D || this.el.sceneEl.querySelector('.btn-toggle-trr-3d');

        if (btn3D) {
            let textoEl = btn3D.querySelector('.texto-btn-trr');
            let fundoEl = btn3D.querySelector('a-box') || btn3D.querySelector('a-plane');

            if (fundoEl) {
                fundoEl.setAttribute('material', 'color', this.estadoFiltro3D ? '#00FF7F' : '#9370DB');
            }

            if (textoEl) {
                if (idCena === 4) {
                    textoEl.setAttribute('text', 'value', this.estadoFiltro3D ? 'RELATIVIDADE: LIGADA' : 'RELATIVIDADE: DESLIGADA');
                } else if (idCena === 5) {
                    textoEl.setAttribute('text', 'value', this.estadoFiltro3D ? 'TRR: LIGADO' : 'TRR: DESLIGADO');
                } else if (idCena === 2) {
                    textoEl.setAttribute('text', 'value', this.estadoFiltro3D ? 'RASTROS: LIGADOS' : 'RASTROS: DESLIGADOS');
                }
            }
        }

        if (idCena === 2) {
            if (typeof enableTrace !== 'undefined') {
                enableTrace = this.estadoFiltro3D;
            }
            if (typeof resetarCena2 === 'function') {
                resetarCena2();
            }
        }

        let switch2D = document.getElementById('switch-relatividade') || document.getElementById('switch-trr') || document.getElementById('chkTrace');
        if (switch2D) {
            switch2D.checked = this.estadoFiltro3D;
            switch2D.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
});