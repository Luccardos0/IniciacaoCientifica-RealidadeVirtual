/**
 * AFRAME COMPONENTS REFACTOR
 * Centralização dos componentes customizados e shaders do projeto.
 */

// Componente de interpolação e acompanhamento (Seguidor dinâmico)
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

// Alias mantido para retrocompatibilidade com as cenas 2 e 3
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

// Shader de gradiente opaco para transparente das caudas
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

/**
 * COMPONENTE: PAINEL EXPLICATIVO INTERATIVO VR
 * Gerencia a troca de páginas de texto (botões rosas) e a navegação entre cenas (botões azuis).
 */
AFRAME.registerComponent('painel-explicativo', {
    schema: {
        cenaAtual: { type: 'number', default: 1 }
    },

    init: function () {
        // Banco de dados centralizado com os textos para cada cena
        this.textos = {
            1: [
                "PÁGINA 1/2\nOs raios cósmicos viajam do espaço até a Terra em altíssima velocidade. Ao colidirem com os gases da alta atmosfera, eles geram uma cascata de novas partículas secundárias.",
                "PÁGINA 2/2\nEssa colisão gera os píons de primeira geração. A dinâmica observada nesta Cena 1 demonstra a distribuição e a ordem aleatória de chegada dessas partículas na superfície terrestre."
            ],
            2: [
                "PÁGINA 1/2\nOs múons são partículas instáveis e de vida curta. Pela física clássica, a maioria deveria decair muito antes de conseguir alcançar o solo, devido à distância da atmosfera.",
                "PÁGINA 2/2\nContudo, devido à Dilatação Temporal da Relatividade Restrita, o tempo passa mais devagar para o múon no referencial da Terra, permitindo que ele atravesse a atmosfera antes de decair."
            ],
            3: [
                "PÁGINA 1/2\nAqui você pode interagir com os parâmetros da simulação. Ajuste a meia-vida das partículas e a quantidade gerada por ciclo utilizando o painel externo.",
                "PÁGINA 2/2\nObserve como o tempo de decaimento altera o comprimento visual das trajetórias e a quantidade de eventos simultâneos que atingem a superfície."
            ]
        };

        this.paginaAtual = 0;
        this.paginasCena = this.textos[this.data.cenaAtual] || ["Texto não encontrado."];
        this.rotas = { 1: 'index.html', 2: 'cena2.html', 3: 'cena3.html' };

        // Captura as tags HTML
        this.textoEl = this.el.querySelector('.texto-conteudo');
        this.btnVoltarTexto = this.el.querySelector('.btn-voltar-texto');
        this.btnAvancarTexto = this.el.querySelector('.btn-avancar-texto');
        this.btnCenaAnterior = this.el.querySelector('.btn-cena-anterior');
        this.btnCenaProxima = this.el.querySelector('.btn-cena-proxima');

        // Binds
        this.atualizarTexto = this.atualizarTexto.bind(this);
        this.mudarPagina = this.mudarPagina.bind(this);
        this.mudarCena = this.mudarCena.bind(this);

        // Listeners de Clique
        if (this.btnVoltarTexto) this.btnVoltarTexto.addEventListener('click', () => this.mudarPagina(-1));
        if (this.btnAvancarTexto) this.btnAvancarTexto.addEventListener('click', () => this.mudarPagina(1));
        if (this.btnCenaAnterior) this.btnCenaAnterior.addEventListener('click', () => this.mudarCena(-1));
        if (this.btnCenaProxima) this.btnCenaProxima.addEventListener('click', () => this.mudarCena(1));

        this.atualizarTexto();
    },

    atualizarTexto: function () {
        if (this.textoEl) {
            this.textoEl.setAttribute('text', 'value', this.paginasCena[this.paginaAtual]);
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
        // CORREÇÃO AQUI: Transforma o texto do HTML em um número real de base 10
        let cenaPura = parseInt(this.data.cenaAtual, 10);
        let novaCena = cenaPura + direcao;
        
        // Loop das cenas
        if (novaCena < 1) novaCena = 3;
        if (novaCena > 3) novaCena = 1;
        
        window.location.href = this.rotas[novaCena];
    }
});