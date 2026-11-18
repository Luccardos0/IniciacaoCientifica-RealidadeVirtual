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
//        this.textos = {
//    1: [
//       "PÁGINA 1/3\nRaios cósmicos de alta energia partem do Sol e colidem com gases na alta atmosfera, gerando uma cascata de partículas secundárias em direção à Terra.",
//        "PÁGINA 2/3\nObserve as cores da simulação: os raios cósmicos (laranja) atingem a camada atmosférica azul e originam múons (roxo), que caem de forma aleatória até o solo.",
//        "PÁGINA 3/3\nOs múons viajam quase à velocidade da luz (v ≈ 0,998c), mas possuem tempo de vida médio próprio de apenas τ0 ≈ 2,2 μs — curto demais para a física clássica."
//    ],
//    2: [
//        "PÁGINA 1/3\nNa alta atmosfera, cada raio cósmico (laranja) gera píons instáveis (roxo), que rapidamente decaem em múons (rosa) e elétrons (amarelo) de segunda geração.",
//        "PÁGINA 2/3\nSem efeitos relativísticos, um múon com vida média τ0 ≈ 2,2 μs percorreria cerca de 660 m antes de decair, impedindo sua chegada à superfície terrestre.",
//        "PÁGINA 3/3\nUse o botão RASTROS abaixo do painel para ligar ou desligar as linhas tracejadas e acompanhar cada etapa do decaimento desde a atmosfera até o solo."
//    ],
//    3: [
//        "PÁGINA 1/3\nVocê está no nível do mar, ponto que representa a travessia máxima da atmosfera (10 a 15 km), onde a física clássica prevê que quase nenhum múon chegaria.",
//        "PÁGINA 2/3\nVeja a cascata no céu: raios cósmicos (azul-claro) geram píons (roxo), que decaem em múons (rosa) e neutrinos (amarelo) seguindo uma taxa probabilística.",
//        "PÁGINA 3/3\nAlterne entre 3 MÚONS e 6 MÚONS no console abaixo para variar a densidade do fluxo e comparar quantas partículas sobrevivem até atingir o oceano."
//    ],
//    4: [
//        "PÁGINA 1/3\nNo referencial de repouso do múon, ele permanece parado enquanto as nuvens e a superfície da Terra sobem em sua direção a velocidade relativística.",
//        "PÁGINA 2/3\nCom a TRR ativa ocorre a contração do espaço: L = L0 / γ.\nPara γ ≈ 10, uma atmosfera de 15 km encolhe para apenas 1,5 km no referencial do múon.",
//        "PÁGINA 3/3\nClique em RELATIVIDADE abaixo: desligada, o tempo próprio (τ0 = 2,2 μs) esgota no ar; ligada, o solo encurtado alcança o múon antes do decaimento."
//    ],
//    5: [
//        "PÁGINA 1/3\nNo referencial da Terra, a atmosfera mantém sua espessura real de 10 a 15 km e observamos os múons descendo em direção ao detector no solo.",
//        "PÁGINA 2/3\nCom a TRR ativa ocorre a dilatação do tempo: Δt = γ · Δt0.\nPara γ ≈ 10, o tempo de vida observado do solo aumenta de 2,2 μs para cerca de 22 μs.",
//        "PÁGINA 3/3\nAtive o botão TRR abaixo: desligado, quase todos os múons decaem no ar; ligado, cerca de 50% atingem a placa sensorial e somam no contador 3D."
//    ]
// };

this.textos = {
    1: [
        "PAGE 1/3\nHigh-energy cosmic rays travel from the Sun and collide with gases in Earth's upper atmosphere, generating a cascade of secondary particles toward the ground.",
        "PAGE 2/3\nObserve the simulation colors: cosmic rays (orange) hit the blue atmospheric layer and produce muons (purple), which fall randomly toward the ground.",
        "PAGE 3/3\nMuons travel near the speed of light (v ≈ 0.998c), yet have a proper mean lifetime of only τ0 ≈ 2.2 μs, far too short according to classical physics."
    ],
    2: [
        "PAGE 1/3\nIn the upper atmosphere, each cosmic ray (orange) produces unstable pions (purple), which quickly decay into second-generation muons (pink) and electrons (yellow).",
        "PAGE 2/3\nWithout relativistic effects, a muon with a mean lifetime of τ0 ≈ 2.2 μs would travel only about 660 m before decaying, preventing it from reaching Earth's surface.",
        "PAGE 3/3\nUse the TRAILS button below the panel to toggle the dashed lines on or off and follow each stage of the decay from the atmosphere down to the ground."
    ],
    3: [
        "PAGE 1/3\nYou are at sea level, representing the full traversal of the atmosphere (10 to 15 km), where classical physics predicts almost no muons would survive.",
        "PAGE 2/3\nWatch the cascade in the sky: cosmic rays (light blue) generate pions (purple), which decay into muons (pink) and neutrinos (yellow) at a probabilistic rate.",
        "PAGE 3/3\nSwitch between 3 MUONS and 6 MUONS on the console below to vary the flux density and compare how many particles survive to reach the ocean."
    ],
    4: [
        "PAGE 1/3\nIn the muon's rest frame, it remains stationary while the clouds and Earth's surface rush upward toward it at relativistic speed.",
        "PAGE 2/3\nWith SR active, length contraction occurs: L = L0 / γ.\nFor γ ≈ 10, a 15 km atmosphere shrinks to just 1.5 km in the muon's reference frame.",
        "PAGE 3/3\nClick RELATIVITY below: when off, proper time (τ0 = 2.2 μs) runs out mid-air; when on, the contracted ground reaches the muon before it decays."
    ],
    5: [
        "PAGE 1/3\nIn Earth's reference frame, the atmosphere keeps its true thickness of 10 to 15 km, and we observe muons descending toward the ground detector.",
        "PAGE 2/3\nWith SR active, time dilation occurs: Δt = γ · Δt0.\nFor γ ≈ 10, the lifetime observed from the ground increases from 2.2 μs to about 22 μs.",
        "PAGE 3/3\nToggle the SR button below: when off, nearly all muons decay in mid-air; when on, about 50% hit the sensor plate and register on the 3D counter."
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

        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024;
        this.canvas.height = 512;
        this.ctx = this.canvas.getContext('2d');
        this.texture = new THREE.CanvasTexture(this.canvas);

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

            const aplicarTextoBotaoCanvas = (elBotao, texto) => {
                if (!elBotao) return;
                let textoEnt = elBotao.querySelector('a-entity[text]');
                if (textoEnt) {
                    let canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 128;
                    let ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, 512, 128);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 52px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(texto, 256, 64);

                    let plane = document.createElement('a-plane');
                    plane.setAttribute('position', '0 0 0.025');
                    plane.setAttribute('width', '0.61');
                    plane.setAttribute('height', '0.22');
                    plane.setAttribute('material', 'transparent: true; opacity: 1; shader: flat');

                    let tex = new THREE.CanvasTexture(canvas);
                    plane.addEventListener('loaded', () => {
                        let m = plane.getObject3D('mesh');
                        if (m && m.material) {
                            m.material.map = tex;
                            m.material.needsUpdate = true;
                        }
                    });

                    elBotao.replaceChild(plane, textoEnt);
                }
            };

            setTimeout(() => {
                aplicarTextoBotaoCanvas(btn3, "3 MÚONS");
                aplicarTextoBotaoCanvas(btn6, "6 MÚONS");
            }, 100);

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

        setTimeout(this.atualizarTexto, 100);
    },

    atualizarTexto: function () {
        if (!this.textoEl) {
            this.textoEl = this.el.sceneEl.querySelector('.texto-conteudo');
        }
        if (!this.textoEl) return;

        // Plano ajustado com maior área útil na caixa de leitura
        if (this.textoEl.tagName.toLowerCase() !== 'a-plane') {
            const parent = this.textoEl.parentNode;
            
            const newPlane = document.createElement('a-plane');
            newPlane.setAttribute('class', 'texto-conteudo');
            newPlane.setAttribute('position', '0 0.12 0.055');
            newPlane.setAttribute('width', '2.25');
            newPlane.setAttribute('height', '1.1');
            newPlane.setAttribute('material', 'transparent: true; opacity: 1; shader: flat');
            
            parent.replaceChild(newPlane, this.textoEl);
            this.textoEl = newPlane;
        }

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        const texto = this.paginasCena[this.paginaAtual] || "";
        const linhas = texto.split('\n');

        let yCursor = 30;
        ctx.fillStyle = "#FFFFFF";
        ctx.textBaseline = "top";

        linhas.forEach((linha, index) => {
            if (index === 0) {
                // Título (PÁGINA X/Y) com letra maior e destaque
                ctx.font = "bold 52px sans-serif";
                ctx.fillStyle = "#FFD1DC";
                ctx.fillText(linha, 35, yCursor);
                yCursor += 70;
            } else {
                // Corpo do texto expandido (44px)
                ctx.font = "bold 44px sans-serif";
                ctx.fillStyle = "#FFFFFF";
                
                const palavras = linha.split(' ');
                let linhaAtual = '';

                for (let n = 0; n < palavras.length; n++) {
                    const testLinha = linhaAtual + palavras[n] + ' ';
                    const metrics = ctx.measureText(testLinha);
                    if (metrics.width > (w - 70) && n > 0) {
                        ctx.fillText(linhaAtual, 35, yCursor);
                        linhaAtual = palavras[n] + ' ';
                        yCursor += 58;
                    } else {
                        linhaAtual = testLinha;
                    }
                }
                ctx.fillText(linhaAtual, 35, yCursor);
                yCursor += 58;
            }
        });

        this.texture.needsUpdate = true;

        const mesh = this.textoEl.getObject3D('mesh');
        if (mesh && mesh.material) {
            mesh.material.map = this.texture;
            mesh.material.needsUpdate = true;
        }
    },

    toggleModalInfo: function () {
        this.infoVisivel = !this.infoVisivel;
        
        if (this.modalInfo) {
            this.modalInfo.setAttribute('visible', this.infoVisivel);
            if (this.infoVisivel) {
                this.modalInfo.setAttribute('scale', '1 1 1');
                this.atualizarTexto();
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