/**
 * LÓGICA CORE DA SIMULAÇÃO DE MÚONS E DECAIMENTOS (PÍON -> MÚON + ELÉTRON)
 * Centraliza geradores imperativos, loops temporizados e integrações com elementos HTML.
 * Gerencia dinamicamente o fluxo de acordo com a cena ativa carregada no DOM.
 */

let particleId = 0;
let uid = 0;
let enableTrace = true;
let mainInterval = null;

const P = AFRAME.utils.coordinates.parse;

// Criador utilitário de elementos A-Frame para manipulação limpa do DOM
const $mk = (parent, tag, attrs) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    parent.appendChild(el);
    return el;
};

// Gera rastro tracejado de cilindros (Cenas 2 e 3)
const makeTrace = (ct, sStr, eStr, col, dly, dur) => {
    if (!enableTrace) return;
    const s = P(sStr), e = P(eStr);
    const dist = Math.sqrt((e.x - s.x)**2 + (e.y - s.y)**2 + (e.z - s.z)**2);
    const dashLen = 0.3, gapLen = 0.15, step = dashLen + gapLen;
    let count = Math.floor(dist / step);
    if (count === 0 && dist > 0.01) count = 1;
    const ang = -Math.atan2(e.x - s.x, e.y - s.y) * (180 / Math.PI);
    for (let i = 0; i < count; i++) {
        const t = i / count; 
        $mk(ct, 'a-entity', {
            geometry: `primitive: cylinder; radius: 0.02; height: ${dashLen}`,
            material: `shader: flat; color: ${col}; opacity: 1.0`,
            position: `${s.x + (e.x-s.x)*t} ${s.y + (e.y-s.y)*t} ${s.z + (e.z-s.z)*t}`,
            rotation: `0 0 ${ang}`,
            visible: 'false',
            animation__v: `property: visible; from: false; to: true; dur: 0; delay: ${dly + (dur * t)}`
        });
    }
};

// Gera cauda cônica em degradê usando o shader personalizado (Cenas 2 e 3)
const makeTail = (ct, lead, s, e, col, sc, dly, dur) => {
    const sP = typeof s === 'string' ? P(s) : s;
    const eP = typeof e === 'string' ? P(e) : e;
    const ang = -Math.atan2(eP.x - sP.x, eP.y - sP.y) * (180 / Math.PI) + 180;
    const h = 1.2 * sc, off = h / 2;
    const len = Math.sqrt((eP.x - sP.x) ** 2 + (eP.y - sP.y) ** 2) || 1;
    const oX = -(eP.x - sP.x) / len * off, oY = -(eP.y - sP.y) / len * off;
    $mk(ct, 'a-entity', {
        geometry: `primitive:cone; radiusBottom:${0.06 * sc}; radiusTop:0.0; height:${h}; openEnded:true`, 
        material: `shader:grad; c:${col}; transparent:true; side:double; depthTest:false`, 
        position: `${sP.x + oX} ${sP.y + oY} ${sP.z}`, rotation: `0 0 ${ang}`,
        dt: `target:${lead.id}; speed:0.6; off:${oX} ${oY} 0`,
        visible: 'false', scale: '0 0 0',
        animation__v: `property:visible; from:false; to:true; dur:0; delay:${dly}`,
        animation__g: `property:scale; to:1 1 1; dur:300; delay:${dly}; easing:easeOutQuad`,
        animation__s: `property:scale; to:0 0 0; dur:300; delay:${dly + dur - 100}`
    });
};

/* --- LÓGICA COMPORTAMENTAL: CENA 1 (Ordem Aleatória) --- */
function spawnSingleRayCena1(posicao) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;
    particleId++;
    const id = particleId;
    const container = document.createElement('a-entity');
    scene.appendChild(container);

    const baseStart = { x: 15, y: 5, z: -25 }, baseAtmos = { x: -11, y: 2, z: -25 }, baseGround = { x: -15, y: 0.5, z: -25 };
    const sunYOffset = posicao * 2.0, earthYOffset = posicao * 4.0;
    const start = { x: baseStart.x, y: baseStart.y + sunYOffset, z: baseStart.z };
    const atmos = { x: baseAtmos.x, y: baseAtmos.y + earthYOffset * 0.85, z: baseAtmos.z };
    const ground = { x: baseGround.x, y: baseGround.y + earthYOffset, z: baseGround.z };

    const colorRay = '#FF4500', colorMuon = '#9370DB'; 

    const rayHead = $mk(container, 'a-entity', {
        id: `ray-head-${id}`, geometry: 'primitive: sphere; radius: 0.15', material: `shader: flat; color: ${colorRay}`,
        position: `${start.x} ${start.y} ${start.z}`,
        animation__move: `property: position; from: ${start.x} ${start.y} ${start.z}; to: ${atmos.x} ${atmos.y} ${atmos.z}; dur: 2000; easing: linear`,
        animation__hide: `property: visible; from: true; to: false; dur: 0; delay: 2000`
    });

    $mk(container, 'a-entity', {
        geometry: 'primitive: cone; radiusBottom: 0.15; radiusTop: 0.01; height: 3.0; openEnded: false',
        material: `shader: flat; color: ${colorRay}; opacity: 0.8; transparent: true`, rotation: '0 0 -84',
        'dynamic-trail': `targetId: ray-head-${id}; lerpSpeed: 0.9; offset: 1.48 0.15 0`,
        animation__hide: `property: visible; from: true; to: false; dur: 0; delay: 2000`
    });

    setTimeout(() => {
        if (!container.parentNode) return;
        const muonHead = $mk(container, 'a-entity', {
            id: `muon-head-${id}`, geometry: 'primitive: sphere; radius: 0.15', material: `color: ${colorMuon}; emissive: ${colorMuon}; emissiveIntensity: 1.5`,
            position: `${atmos.x} ${atmos.y} ${atmos.z}`,
            animation__fall: `property: position; from: ${atmos.x} ${atmos.y} ${atmos.z}; to: ${ground.x} ${ground.y} ${ground.z}; dur: 1200; easing: linear`,
            animation__die: `property: scale; to: 0 0 0; dur: 100; delay: 1200`
        });

        $mk(container, 'a-entity', {
            geometry: 'primitive: cone; radiusBottom: 0.15; radiusTop: 0.0; height: 1.5; openEnded: false',
            material: `color: ${colorMuon}; opacity: 0.8; transparent: true`, rotation: '0 0 -67',
            'dynamic-trail': `targetId: muon-head-${id}; lerpSpeed: 0.9; offset: 0.65 0.28 0`,
            animation__die: `property: scale; to: 0 0 0; dur: 100; delay: 1200`
        });
    }, 2000);

    setTimeout(() => container.parentNode && container.parentNode.removeChild(container), 3500);
}

function spawnBatchCena1() {
    let posicoes = [1, 0, -1]; 
    for (let i = posicoes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [posicoes[i], posicoes[j]] = [posicoes[j], posicoes[i]];
    }
    setTimeout(() => spawnSingleRayCena1(posicoes[0]), 0);
    setTimeout(() => spawnSingleRayCena1(posicoes[1]), 400); 
    setTimeout(() => spawnSingleRayCena1(posicoes[2]), 800); 
}

/* --- LÓGICA COMPORTAMENTAL: CENA 2 (Decaimento Píon -> Múon + Elétron) --- */
function spawnEventCena2() {
    const scene = document.querySelector('a-scene');
    if(!scene) return;
    const rndX = (Math.random() * 14) - 7, rndZ = (Math.random() * 8) - 4; 
    const radiusSq = 81, distSq = (rndX * rndX) + (rndZ * rndZ);
    if (distSq >= radiusSq) return; 
    const collisionY = Math.sqrt(radiusSq - distSq) - 4;
    if (collisionY < 3.5) return; 

    const ct = $mk(scene, 'a-entity', { position: `${rndX} 0 ${rndZ}` });
    const topY = 20, atmosY = collisionY, splitH = atmosY - 1.5, floorY = 0.5; 
    const tRay = 1500, tParent = 1500, tChildBase = 3000;
    
    // Cores das partículas de acordo com as novas definições
    const cRay = '#FF4500'; // Raio Cósmico (Laranja)
    const cPion = '#9370DB'; // Píon de 1ª Geração (Roxo)
    const cMuon = '#FFB6C1'; // Múon de 2ª Geração (Rosa Suave)
    const cElec = '#FFD700'; // Elétron de 2ª Geração (Amarelo Ouro)

    const sRay = `0 ${topY} -8`, eRay = `0 ${atmosY} -8`; 

    // 1. Raio Cósmico Inicial
    const rayId = 'r' + uid++;
    const ray = $mk(ct, 'a-entity', {
        id: rayId, geometry: 'primitive:sphere; radius:0.06', material: `shader:flat; color:${cRay}`, position: sRay,
        animation__mv: `property:position; from:${sRay}; to:${eRay}; dur:${tRay}; easing:linear`,
        animation__hd: `property:visible; from:true; to:false; dur:0; delay:${tRay}`
    });
    makeTail(ct, ray, sRay, eRay, cRay, 1, 0, tRay);
    makeTrace(ct, sRay, eRay, cRay, 0, tRay);

    // 2. Criação do Píon (Roxo)
    const spawnPion = (endX, side) => {
        const s = { x: side, y: atmosY, z: -8 }, e = { x: endX, y: splitH, z: -8 };
        const sS = `${s.x} ${s.y} ${s.z}`, eS = `${e.x} ${e.y} ${e.z}`;
        const pId = 'p' + uid++;
        const p = $mk(ct, 'a-entity', {
            id: pId, geometry: 'primitive:sphere; radius:0.14', material: `shader:flat; color:${cPion}`, position: sS, visible: 'false',
            animation__v: `property:visible; to:true; dur:0; delay:${tRay}`,
            animation__m: `property:position; from:${sS}; to:${eS}; dur:${tParent}; delay:${tRay}; easing:linear`,
            animation__h: `property:visible; to:false; dur:0; delay:${tRay + tParent}`
        });
        makeTail(ct, p, s, e, cPion, 2.2, tRay, tParent); 
        makeTrace(ct, sS, eS, cPion, tRay, tParent);
    };
    spawnPion(-2.5, -0.3); // Píon da Esquerda
    spawnPion(2.5, 0.3);  // Píon da Direita

    // 3. Decaimento das Partículas Filhas (Múon e Elétron)
    const spawnChild = (sX, eX, particleType) => {
        const isMuon = particleType === 'muon'; 
        const corFilha = isMuon ? cMuon : cElec;
        const raioFilho = isMuon ? 0.07 : 0.04; 
        const escalaCauda = isMuon ? 1.1 : 0.6;

        const survive = Math.random() < 0.20, fullDrop = splitH - floorY, deathRatio = 0.3 + (Math.random() * 0.5); 
        let yEnd = survive ? floorY : splitH - (fullDrop * deathRatio);
        yEnd = Math.max(yEnd, floorY);
        const dur = survive ? tChildBase : tChildBase * deathRatio;
        const ratioTraveled = (splitH - yEnd) / fullDrop;
        const xEnd = sX + (eX - sX) * ratioTraveled;
        const s = { x: sX, y: splitH, z: -8 }, e = { x: xEnd, y: yEnd, z: -8 };
        const sS = `${s.x} ${s.y} ${s.z}`, eS = `${e.x} ${e.y} ${e.z}`;
        const startT = tRay + tParent;
        
        const c = $mk(ct, 'a-entity', {
            id: 'c' + uid++, geometry: `primitive:sphere; radius:${raioFilho}`, material: `shader:flat; color:${corFilha}`, position: sS, visible: 'false',
            animation__v: `property:visible; to:true; dur:0; delay:${startT}`,
            animation__m: `property:position; from:${sS}; to:${eS}; dur:${dur}; delay:${startT}; easing:linear`,
            animation__f: `property:scale; to:0 0 0; dur:150; delay:${startT + dur}`
        });
        makeTail(ct, c, s, e, corFilha, escalaCauda, startT, dur);
        makeTrace(ct, sS, eS, corFilha, startT, dur);
    };
    
    // RAMO ESQUERDO
    spawnChild(-2.5, -3.5, 'muon');     
    spawnChild(-2.5, -1.5, 'electron'); 

    // RAMO DIREITO
    spawnChild(2.5, 1.5, 'muon');       
    spawnChild(2.5, 3.5, 'electron');   

    setTimeout(() => ct.parentNode && ct.parentNode.removeChild(ct), tRay + tParent + tChildBase + 2000);
}

const loopCena2 = () => {
    const qtd = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < qtd; i++) setTimeout(spawnEventCena2, Math.random() * 3000);
};

/* --- LÓGICA COMPORTAMENTAL: CENA 3 (Modificada com base na estrutura estável da Cena 2) --- */
const spawnEventCena3 = () => {
    const container = document.querySelector('#muon-container');
    if(!container) return;

    const halfLife = parseFloat(document.getElementById('inputLife').value) * 1000;
    const qty = parseInt(document.getElementById('inputQty').value);

    // Mapeamento idêntico de cores da Cena 2
    const cRay = '#87CEEB';  
    const cPion = '#9370DB'; // Píon de 1ª Geração (Roxo)
    const cMuon = '#FFB6C1'; // Múon de 2ª Geração (Rosa Suave)
    const cNeut = '#FFD700'; // Neutrino/Elétron de 2ª Geração (Amarelo)

    for(let i = 0; i < qty; i++) {
        setTimeout(() => {
            if(!container.parentNode) return;

            const rndX = (Math.random() * 60) - 30, rndZ = -(Math.random() * 15 + 5); 
            const ct = $mk(container, 'a-entity', { position: `${rndX} 0 ${rndZ}` });
            
            const topY = 30, atmosY = 15, splitH = 10, floorY = 0.5; 
            const tRay = halfLife * 0.7, tParent = halfLife * 0.7, tChild = halfLife;

            const rayId = 'r' + uid++;
            const ray = $mk(ct, 'a-entity', {
                id: rayId, geometry: 'primitive:sphere; radius:0.06', material: `shader:flat; color:${cRay}`, position: `0 ${topY} 0`,
                animation__mv: `property:position; to:0 ${atmosY} 0; dur:${tRay}; easing:linear`
            });
            makeTail(ct, ray, `0 ${topY} 0`, `0 ${atmosY} 0`, cRay, 1, 0, tRay);
            makeTrace(ct, `0 ${topY} 0`, `0 ${atmosY} 0`, cRay, 0, tRay);

            // 2. Geração dos Píons Dinâmicos (Roxo)
            setTimeout(() => {
                const spawnParentPion = (endX) => {
                    const sS = `0 ${atmosY} 0`, eS = `${endX} ${splitH} 0`;
                    const pId = 'p' + uid++;
                    const p = $mk(ct, 'a-entity', {
                        id: pId, geometry: 'primitive:sphere; radius:0.14', material: `shader:flat; color:${cPion}`, position: sS,
                        animation: `property:position; to:${eS}; dur:${tParent}; easing:linear`
                    });
                    makeTail(ct, p, sS, eS, cPion, 2.2, 0, tParent);
                    makeTrace(ct, sS, eS, cPion, 0, tParent);

                    // 3. Decaimento das Partículas Filhas (Múon + Neutrino) com controle direcional anti-cruzamento
                    setTimeout(() => {
                        const spawnGen2Product = (particleType) => {
                            const isMuon = particleType === 'muon';
                            const corFilha = isMuon ? cMuon : cNeut;
                            const raioFilho = isMuon ? 0.07 : 0.04;
                            const escalaCauda = isMuon ? 1.1 : 0.6;

                            const survives = Math.random() <= 0.3;
                            const targetY = survives ? floorY : splitH * 0.4;
                            const actualDur = survives ? tChild : tChild * 0.6;
                            
                            // impede o cruzamento calculando a projeção baseada no lado do pai (endX)
                            const direcaoPai = endX > 0 ? 1 : -1;
                            const desvioX = isMuon ? 1.2 : 0.3;
                            const targetX = endX + (direcaoPai * desvioX);

                            const s2 = `${endX} ${splitH} 0`, e2 = `${targetX} ${targetY} 0`;
                            const cId = 'c' + uid++;
                            
                            const c = $mk(ct, 'a-entity', {
                                id: cId, geometry: `primitive:sphere; radius:${raioFilho}`, material: `shader:flat; color:${corFilha}`, position: s2, 
                                animation: `property:position; to:${e2}; dur:${actualDur}; easing:linear`,
                                animation__scale: `property:scale; to:0 0 0; dur:200; delay:${actualDur - 200}`
                            });
                            makeTail(ct, c, s2, e2, corFilha, escalaCauda, 0, actualDur);
                            makeTrace(ct, s2, e2, corFilha, 0, actualDur);
                        };

                        // Dispara exatamente um Múon e um Neutrino por braço
                        spawnGen2Product('muon');
                        spawnGen2Product('neutrino');

                    }, tParent);
                };
                
                spawnParentPion(-2); // Píon da Esquerda
                spawnParentPion(2);  // Píon da Direita

            }, tRay);

            setTimeout(() => ct.parentNode && ct.parentNode.removeChild(ct), halfLife * 5);
        }, Math.random() * 1000);
    }
};

const resetSimulationCena3 = () => {
    if (mainInterval) clearInterval(mainInterval);
    const container = document.querySelector('#muon-container');
    if(container) container.innerHTML = ''; 
    spawnEventCena3();
    mainInterval = setInterval(spawnEventCena3, 4000);
};

/* --- ENGENHARIA DE SOFTWARE: ORQUESTRADOR NATIVO DE CICLO DE VIDA --- */
const initSimulation = () => {
    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) return;

    const sceneId = sceneEl.id;

    if (sceneId === 'sceneCena1') {
        spawnBatchCena1(); 
        setInterval(spawnBatchCena1, 2500);
    } 
    else if (sceneId === 'sceneCena2') {
        const chkTrace = document.getElementById('chkTrace');
        if(chkTrace) {
            chkTrace.addEventListener('change', (e) => { enableTrace = e.target.checked; });
        }
        setInterval(loopCena2, 4000);
        loopCena2(); 
    } 
    else if (sceneId === 'sceneCena3') {
        const inputLife = document.getElementById('inputLife');
        const inputQty = document.getElementById('inputQty');
        const valQty = document.getElementById('valQty');

        if(inputLife) inputLife.addEventListener('change', resetSimulationCena3);
        if(inputQty && valQty) {
            inputQty.addEventListener('input', () => { valQty.innerText = inputQty.value; });
            inputQty.addEventListener('change', resetSimulationCena3);
        }
        resetSimulationCena3();
    }
};

// Padrão Arquitetural A-Frame: Executa estritamente após o evento 'loaded' do motor 3D
const sceneEl = document.querySelector('a-scene');
if (sceneEl) {
    if (sceneEl.hasLoaded) {
        initSimulation();
    } else {
        sceneEl.addEventListener('loaded', initSimulation);
    }
} else {
    window.addEventListener('DOMContentLoaded', () => {
        const structuralScene = document.querySelector('a-scene');
        if (structuralScene) {
            structuralScene.addEventListener('loaded', initSimulation);
        }
    });
}

//-----Cena4--------

/* --- ORQUESTRADOR NATIVO: INJEÇÃO COMPLEMENTAR CENA 4 --- */
// Vincula a inicialização automática à árvore de execução da Cena 4
window.addEventListener('DOMContentLoaded', () => {
    const structuralScene = document.querySelector('a-scene');
    if (structuralScene && structuralScene.id === 'sceneCena4') {
        if (structuralScene.hasLoaded) {
            inicializarCena4();
        } else {
            structuralScene.addEventListener('loaded', inicializarCena4);
        }
    }
});

function inicializarCena4() {
    const containerNuvens = document.getElementById('container-nuvens');
    const containerSolo = document.getElementById('container-solo');
    const switchRelatividade = document.getElementById('switch-relatividade');
    const statusPainel = document.getElementById('status-painel');
    const hudSucesso = document.getElementById('hud-sucesso');

    if (!containerNuvens || !switchRelatividade) return;

    const TOTAL_NUVENS = 12;
    const LIMITE_INFERIOR_Y = -35; 
    const LIMITE_SUPERIOR_Y = 35;  
    const VELOCIDADE_QUEDA = 2500;  

    let modoRelativisticoAtivo = false;
    let timeoutFimDaQueda = null;
    let soloEntidade = null;

    // 1. POOLING DE NUVENS USANDO A SUA FUNÇÃO UTILITÁRIA $MK
    for (let i = 0; i < TOTAL_NUVENS; i++) {
        let yInicial = Math.random() * (LIMITE_SUPERIOR_Y - LIMITE_INFERIOR_Y) + LIMITE_INFERIOR_Y;
        gerarNuvemNoPool(yInicial);
    }

    function gerarNuvemNoPool(yStart) {
        let xRand = (Math.random() - 0.5) * 45;
        let zRand = -(Math.random() * 15 + 4); // Posiciona à frente do campo visual da câmera fixa
        
        let duracaoAjustada = VELOCIDADE_QUEDA * ((LIMITE_SUPERIOR_Y - yStart) / (LIMITE_SUPERIOR_Y - LIMITE_INFERIOR_Y));

        // Reutilização limpa do $mk com o seu shader grad integrado para suavizar as bordas das nuvens
        const nuvem = $mk(containerNuvens, 'a-entity', {
            //geometry: "primitive: cone; radiusBottom: 3.5; radiusTop: 0.0; height: 1.5; openEnded: true",
            geometry: "primitive: sphere; radius: 4", 
            scale: "2 0.4 3",
            position: `${xRand} ${yStart} ${zRand}`,
            rotation: "0 0 180", // Aponta para baixo dando dinâmica de compressão aerodinâmica
            material: "shader: grad; c: #ffffff; transparent: true; side: double",
            animation__move: `property: position; to: ${xRand} ${LIMITE_SUPERIOR_Y} ${zRand}; dur: ${duracaoAjustada}; easing: linear; loop: false`
        });

        // Loop Infinito por escuta de evento de animação do DOM
        nuvem.addEventListener('animationcomplete__move', () => {
            let novoX = (Math.random() - 0.5) * 45;
            let novoZ = -(Math.random() * 15 + 4);

            nuvem.setAttribute('position', `${novoX} ${LIMITE_INFERIOR_Y} ${novoZ}`);
            nuvem.setAttribute('animation__move', `property: position; from: ${novoX} ${LIMITE_INFERIOR_Y} ${novoZ}; to: ${novoX} ${LIMITE_SUPERIOR_Y} ${novoZ}; dur: ${VELOCIDADE_QUEDA}; easing: linear; loop: false`);
        });
    }

    // 2. SISTEMA DE GESTÃO FÍSICA (CLÁSSICA VS RELATIVÍSTICA)
    function gerenciarCicloDeFisica() {
        limparCenarioRelativistico();

        if (modoRelativisticoAtivo) {
            statusPainel.innerHTML = `1. Tempo Próprio ($\tau$): 2.2 $\mu$s<br>2. Distância Atmosférica: <span style="color:#87CEEB; font-weight:bold;">Contraída</span>.<br><br>A velocidade relativística encolheu o espaço. A superfície da Terra vai colidir com o Múon!`;
            
            // Situação B: O solo sobe após 4.5 segundos de queda livre simulada
            timeoutFimDaQueda = setTimeout(() => {
                dispararSubidaDoSolo();
            }, 4500);
        } else {
            statusPainel.innerHTML = `1. Tempo Próprio ($\tau$): 2.2 $\mu$s<br>2. Distância Atmosférica: Clássica (15km).<br><br><span style="color:#FF4500; font-weight:bold;">Queda Perpétua:</span> Sem a contração espacial da relatividade, o Múon decairá antes de ver o chão.`;
        }
    }

    function dispararSubidaDoSolo() {
        // Geração do solo verde tridimensional com $mk
        soloEntidade = $mk(containerSolo, 'a-plane', {
            id: "solo-terra",
            position: "0 -50 0",
            rotation: "-90 0 0",
            width: "250",
            height: "250",
            color: "#1e3d29",
            src: "#textura-solo",
            material: "roughness: 0.9; repeat: 10 10",
            animation__subir: "property: position; to: 0 0 0; dur: 2000; easing: easeOutQuad"
        });

        // Verificação de Impacto com o referencial fixo (Altura dos olhos)
        soloEntidade.addEventListener('animationcomplete__subir', () => {
            if(hudSucesso) {
                hudSucesso.setAttribute('value', "SUPERFICIE ALCANÇADA!\nContracao do Espaco Comprovada.");
                hudSucesso.emit('mostrarMsg');
            }

            setTimeout(() => {
                if(hudSucesso) hudSucesso.emit('esconderMsg');
                gerenciarCicloDeFisica(); // Reseta o loop de aproximação planetária
            }, 2500);
        });
    }

    function limparCenarioRelativistico() {
        if (timeoutFimDaQueda) {
            clearTimeout(timeoutFimDaQueda);
            timeoutFimDaQueda = null;
        }
        if (soloEntidade && soloEntidade.parentNode) {
            soloEntidade.parentNode.removeChild(soloEntidade);
            soloEntidade = null;
        }
    }

    // Escutador reativo do switch HTML
    switchRelatividade.addEventListener('change', (event) => {
        modoRelativisticoAtivo = event.target.checked;
        gerenciarCicloDeFisica();
    });

    // Disparo inicial
    gerenciarCicloDeFisica();
}


//-----Cena 5--------

/* --- ORQUESTRADOR NATIVO: INJEÇÃO COMPLEMENTAR CENA 5 --- */
window.addEventListener('DOMContentLoaded', () => {
    const structuralScene = document.querySelector('a-scene');
    if (structuralScene && structuralScene.id === 'sceneCena5') {
        if (structuralScene.hasLoaded) {
            inicializarCena5();
        } else {
            structuralScene.addEventListener('loaded', inicializarCena5);
        }
    }
});

function inicializarCena5() {
    const chuvaContainer = document.getElementById('chuva-muons');
    const switchTRR = document.getElementById('switch-trr');
    const statusPainel = document.getElementById('status-painel');

    if (!chuvaContainer || !switchTRR) return;

    let trrAtiva = false;
    let loopChuvaId = null;
    let geradorUid = 0;

    const corMuon = '#FFB6C1'; // Múon de 2ª Geração (Rosa Suave)

    function spawnMuonCaindo() {
        if (!chuvaContainer.parentNode) return;

        // Distribui os múons ao redor do usuário estático
        const angulo = Math.random() * Math.PI * 2;
        const raio = Math.random() * 12; 
        const xPos = Math.cos(angulo) * raio;
        const zPos = Math.sin(angulo) * raio;

        const alturaNascimento = 25; // Alta atmosfera simulada
        const alturaChao = 0.1;      // Nível do mar

        let targetY = alturaChao;
        let sobreviventeEstatistico = true;

        if (!trrAtiva) {
            // SITUAÇÃO A: TRR DESLIGADA - 100% decaem no topo/meio da atmosfera
            targetY = 12 + (Math.random() * 4); // Morrem alto (entre Y=12 e Y=16)
            sobreviventeEstatistico = false;
        } else {
            // SITUAÇÃO B: TRR LIGADA - Regra estatística de 50% de chance (Meia-vida)
            if (Math.random() < 0.5) {
                // 50% dos Múons decaem no meio do ar antes de tocar o chão
                targetY = 2 + (Math.random() * 10); // Desintegram-se em altitudes variadas (Y=2 a Y=10)
                sobreviventeEstatistico = false;
            } else {
                // Os outros 50% completam a viagem com sucesso e colidem com o solo
                targetY = alturaChao;
                sobreviventeEstatistico = true;
            }
        }

        const idParticula = 'm5_' + geradorUid++;
        const distanciaTotal = alturaNascimento - targetY;
        const duracaoMovimento = distanciaTotal * 130; // Velocidade linear de queda proporcional

        // Injeção procedural via $mk com o shader grad
        const muonNode = $mk(chuvaContainer, 'a-entity', {
            id: idParticula,
            geometry: "primitive: cone; radiusBottom: 0.08; radiusTop: 0.0; height: 1.2; openEnded: true",
            position: `${xPos} ${alturaNascimento} ${zPos}`,
            rotation: "0 0 0",
            material: `shader: grad; c: ${corMuon}; transparent: true; side: double`,
            animation__queda: `property: position; to: ${xPos} ${targetY} ${zPos}; dur: ${duracaoMovimento}; easing: linear`
        });

        // Evento executado no fim da trajetória calculada
        muonNode.addEventListener('animationcomplete__queda', () => {
            if (!sobreviventeEstatistico) {
                // Efeito visual de desintegração/decaimento no meio do ar
                muonNode.setAttribute('animation__decaimento', "property: scale; to: 0 0 0; dur: 200; easing: easeInQuad");
            } else {
                // Colisão física com o solo/mar (esmaecimento rápido por impacto)
                muonNode.setAttribute('animation__impacto', "property: scale; to: 1 0 1; dur: 100; easing: linear");
            }
            
            // Remoção segura do nó do DOM
            setTimeout(() => {
                if (muonNode.parentNode) {
                    muonNode.parentNode.removeChild(muonNode);
                }
            }, 210);
        });
    }

    function gerenciarCicloChuva() {
        if (loopChuvaId) clearInterval(loopChuvaId);
        chuvaContainer.innerHTML = '';

        if (trrAtiva) {
            statusPainel.innerHTML = `
                <strong>Física Relativística Ativa</strong><br>
                <strong>Dilatação do Tempo:</strong> $t = \\gamma t_0$<br><br>
                <span style="color:#9370DB; font-weight:bold;">Status:</span> Tempo de vida estendido pela velocidade. Devido à natureza probabilística da meia-vida, <strong>~50% alcançam o solo</strong> e a outra metade decai no ar.
            `;
            loopChuvaId = setInterval(spawnMuonCaindo, 250);
        } else {
            statusPainel.innerHTML = `
                <strong>Física Clássica Pura</strong><br>
                <strong>Tempo de Vida Clássico:</strong> 2.2 $\\mu$s<br><br>
                <span style="color:#FF4500; font-weight:bold;">Status:</span> Sem dilatação temporal, a vida útil expira rápido demais para a escala da atmosfera. <strong>0% dos múons alcançam o solo</strong>.
            `;
            loopChuvaId = setInterval(spawnMuonCaindo, 400);
        }
    }

    switchTRR.addEventListener('change', (e) => {
        trrAtiva = e.target.checked;
        gerenciarCicloChuva();
    });

    gerenciarCicloChuva();
}