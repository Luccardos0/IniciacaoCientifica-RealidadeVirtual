/**
 * LÓGICA CORE DA SIMULAÇÃO DE MÚONS E DECAIMENTOS (PÍON -> MÚON + ELÉTRON)
 * Centraliza geradores imperativos, loops temporizados e integrações com elementos HTML.
 * Gerencia dinamicamente o fluxo de acordo com a cena ativa carregada no DOM.
 */

let particleId = 0;
let uid = 0;
let enableTrace = true;
let mainInterval = null;
let intervalCena2 = null;

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

/* --- LÓGICA COMPORTAMENTAL: CENA 1 --- */
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

/* --- LÓGICA COMPORTAMENTAL: CENA 2 --- */
function spawnEventCena2() {
    const scene = document.querySelector('a-scene');
    if(!scene) return;
    const rndX = (Math.random() * 14) - 7, rndZ = (Math.random() * 8) - 4; 
    const radiusSq = 81, distSq = (rndX * rndX) + (rndZ * rndZ);
    if (distSq >= radiusSq) return; 
    const collisionY = Math.sqrt(radiusSq - distSq) - 4;
    if (collisionY < 3.5) return; 

    const ct = $mk(scene, 'a-entity', { 
        class: 'container-particula',
        position: `${rndX} 0 ${rndZ}` 
    });

    const topY = 20, atmosY = collisionY, splitH = atmosY - 1.5, floorY = 0.5; 
    const tRay = 1500, tParent = 1500, tChildBase = 3000;
    
    const cRay = '#FF4500';
    const cPion = '#9370DB';
    const cMuon = '#FFB6C1';
    const cElec = '#FFD700';

    const sRay = `0 ${topY} -8`, eRay = `0 ${atmosY} -8`; 

    const rayId = 'r' + uid++;
    const ray = $mk(ct, 'a-entity', {
        id: rayId, geometry: 'primitive:sphere; radius:0.06', material: `shader:flat; color:${cRay}`, position: sRay,
        animation__mv: `property:position; from:${sRay}; to:${eRay}; dur:${tRay}; easing:linear`,
        animation__hd: `property:visible; from:true; to:false; dur:0; delay:${tRay}`
    });
    makeTail(ct, ray, sRay, eRay, cRay, 1, 0, tRay);
    makeTrace(ct, sRay, eRay, cRay, 0, tRay);

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
    spawnPion(-2.5, -0.3);
    spawnPion(2.5, 0.3);

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
    
    spawnChild(-2.5, -3.5, 'muon');     
    spawnChild(-2.5, -1.5, 'electron'); 
    spawnChild(2.5, 1.5, 'muon');       
    spawnChild(2.5, 3.5, 'electron');   

    setTimeout(() => ct.parentNode && ct.parentNode.removeChild(ct), tRay + tParent + tChildBase + 2000);
}

const loopCena2 = () => {
    const qtd = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < qtd; i++) setTimeout(spawnEventCena2, Math.random() * 3000);
};

function iniciarLoopCena2() {
    if (intervalCena2) clearInterval(intervalCena2);
    loopCena2();
    intervalCena2 = setInterval(loopCena2, 4000);
}

function resetarCena2() {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    const particulasAtivas = scene.querySelectorAll('.container-particula');
    particulasAtivas.forEach(particula => {
        if (particula.parentNode === scene) {
            scene.removeChild(particula);
        }
    });

    iniciarLoopCena2();
}

/* --- LÓGICA COMPORTAMENTAL: CENA 3 --- */
let qtdMuonsCena3 = 3; 

function setQtdMuonsCena3(novaQtd) {
    qtdMuonsCena3 = novaQtd;
    resetSimulationCena3(); 
}

const spawnEventCena3 = () => {
    const container = document.querySelector('#muon-container');
    if(!container) return;

    const halfLife = 2000;
    const qty = qtdMuonsCena3;

    const cRay = '#87CEEB';  
    const cPion = '#9370DB';
    const cMuon = '#FFB6C1';
    const cNeut = '#FFD700';

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

            setTimeout(() => {
                const spawnParentPion = (endX) => {
                    const sS = `0 ${atmosY} 0`, eS = `${endX} ${splitH} 0`;
                    const pId = 'p' + uid++;
                    
                    const p = $mk(ct, 'a-entity', {
                        id: pId, 
                        geometry: 'primitive:sphere; radius:0.14', 
                        material: `shader:flat; color:${cPion}`, 
                        position: sS,
                        animation: `property:position; to:${eS}; dur:${tParent}; easing:linear`,
                        animation__h: `property:visible; to:false; dur:0; delay:${tParent}`
                    });
                    
                    makeTail(ct, p, sS, eS, cPion, 2.2, 0, tParent);
                    makeTrace(ct, sS, eS, cPion, 0, tParent);

                    setTimeout(() => {
                        const spawnGen2Product = (particleType) => {
                            const isMuon = particleType === 'muon';
                            const corFilha = isMuon ? cMuon : cNeut;
                            const raioFilho = isMuon ? 0.07 : 0.04;
                            const escalaCauda = isMuon ? 1.1 : 0.6;

                            const survives = Math.random() <= 0.3;
                            const targetY = survives ? floorY : splitH * 0.4;
                            const actualDur = survives ? tChild : tChild * 0.6;
                            
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

                        spawnGen2Product('muon');
                        spawnGen2Product('neutrino');

                    }, tParent);
                };
                
                spawnParentPion(-2);
                spawnParentPion(2);

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

/* --- ORQUESTRADOR NATIVO (CENAS 1, 2 E 3) --- */
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
            chkTrace.addEventListener('change', (e) => { 
                enableTrace = e.target.checked; 
                resetarCena2();
            });
        }
        iniciarLoopCena2(); 
    } 
    else if (sceneId === 'sceneCena3') {
        resetSimulationCena3();
    }
};

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

/* --- ORQUESTRADOR NATIVO: CENA 4 (REFERENCIAL DO MÚON COM CONGELAMENTO NO DECAIMENTO) --- */
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
    const containerDecaimento = document.getElementById('container-decaimento');
    const switchRelatividade = document.getElementById('switch-relatividade');
    const statusPainel = document.getElementById('status-painel');
    const hudSucesso = document.getElementById('hud-sucesso');

    if (!containerNuvens || !switchRelatividade) return;

    const TOTAL_NUVENS = 24;
    const LIMITE_INFERIOR_Y = -40; 
    const LIMITE_SUPERIOR_Y = 40;  
    const VELOCIDADE_BASE = 32.0; 

    let modoRelativisticoAtivo = false;
    let animarNuvens = true;
    let timerCiclo = null;
    let soloEntidade = null;
    let nuvensData = [];
    let lastTime = performance.now();

    // Cria/reseta a distribuição inicial das nuvens
    function resetarPosicaoNuvens() {
        containerNuvens.innerHTML = '';
        nuvensData = [];

        for (let i = 0; i < TOTAL_NUVENS; i++) {
            const xRand = (Math.random() - 0.5) * 45;
            const zRand = -(Math.random() * 18 + 2.5);
            const yRand = Math.random() * (LIMITE_SUPERIOR_Y - LIMITE_INFERIOR_Y) + LIMITE_INFERIOR_Y;

            const elNuvem = $mk(containerNuvens, 'a-entity', {
                geometry: "primitive: sphere; radius: 3.2; segmentsWidth: 18; segmentsHeight: 18",
                scale: "2.2 1.4 2.2",
                position: `${xRand} ${yRand} ${zRand}`,
                material: "shader: grad; c: #ffffff; transparent: true; opacity: 0.85; depthWrite: false; side: front"
            });

            nuvensData.push({
                el: elNuvem,
                x: xRand,
                y: yRand,
                z: zRand,
                speedOffset: 0.85 + Math.random() * 0.35
            });
        }
    }

    resetarPosicaoNuvens();

    // Loop contínuo das nuvens com suporte a congelamento
    function loopAnimacaoNuvens(currentTime) {
        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        if (animarNuvens && delta < 0.1) {
            const multiplicadorTRR = modoRelativisticoAtivo ? 1.6 : 1.0;
            const stepSpeed = VELOCIDADE_BASE * multiplicadorTRR * delta;

            for (let i = 0; i < nuvensData.length; i++) {
                const nuvem = nuvensData[i];
                nuvem.y += stepSpeed * nuvem.speedOffset;

                if (nuvem.y > LIMITE_SUPERIOR_Y) {
                    nuvem.y = LIMITE_INFERIOR_Y;
                    nuvem.x = (Math.random() - 0.5) * 45;
                    nuvem.z = -(Math.random() * 18 + 2.5);
                }
                nuvem.el.object3D.position.set(nuvem.x, nuvem.y, nuvem.z);
            }
        }
        requestAnimationFrame(loopAnimacaoNuvens);
    }
    requestAnimationFrame(loopAnimacaoNuvens);

    function dispararDecaimentoClassico() {
        // 1. CONGELA A CENA (para o movimento das nuvens exatamente onde estão)
        animarNuvens = false;

        if (containerDecaimento) {
            containerDecaimento.innerHTML = '';

            // Flash de decaimento
            const flash = $mk(containerDecaimento, 'a-light', {
                type: 'point',
                intensity: '4',
                distance: '6',
                color: '#FFD700'
            });

            // Partículas ejetadas
            $mk(containerDecaimento, 'a-sphere', {
                radius: '0.03',
                material: 'shader: flat; color: #FFD700',
                position: '0 0 0',
                animation__mv: 'property: position; to: 1.2 0.7 -0.5; dur: 500; easing: easeOutQuad',
                animation__sc: 'property: scale; to: 0 0 0; dur: 500; easing: easeInQuad'
            });

            $mk(containerDecaimento, 'a-sphere', {
                radius: '0.02',
                material: 'shader: flat; color: #FFFFFF',
                position: '0 0 0',
                animation__mv: 'property: position; to: -1.0 -0.8 0.4; dur: 500; easing: easeOutQuad',
                animation__sc: 'property: scale; to: 0 0 0; dur: 500; easing: easeInQuad'
            });

            $mk(containerDecaimento, 'a-sphere', {
                radius: '0.02',
                material: 'shader: flat; color: #87CEEB',
                position: '0 0 0',
                animation__mv: 'property: position; to: -0.4 1.1 0.6; dur: 500; easing: easeOutQuad',
                animation__sc: 'property: scale; to: 0 0 0; dur: 500; easing: easeInQuad'
            });

            setTimeout(() => {
                if (flash && flash.parentNode) flash.parentNode.removeChild(flash);
            }, 300);
        }

        // 2. Exibe o HUD com a mensagem
        if (hudSucesso) {
            hudSucesso.setAttribute('value', "TEMPO PRÓPRIO ESGOTADO (2.2 µs)\nO múon decaiu na atmosfera antes de atingir o solo.");
            hudSucesso.setAttribute('color', '#fb735a');
            hudSucesso.emit('mostrarMsg');
        }

        // 3. Aguarda a leitura com a cena congelada, esconde a mensagem e reseta lá do começo
        setTimeout(() => {
            if (hudSucesso) hudSucesso.emit('esconderMsg');
            resetarPosicaoNuvens(); // Reseta nuvens lá do início
            gerenciarCicloDeFisica(); // Reinicia o ciclo
        }, 2800);
    }

    function dispararSubidaDoSolo() {
        soloEntidade = $mk(containerSolo, 'a-plane', {
            id: "solo-terra",
            position: "0 -60 0",
            rotation: "-90 0 0",
            width: "300",
            height: "300",
            color: "#2b8a4c",
            src: "#textura-solo",
            material: "roughness: 0.9; repeat: 12 12",
            animation__subir: "property: position; to: 0 0 0; dur: 1200; easing: easeOutCubic"
        });

        soloEntidade.addEventListener('animationcomplete__subir', () => {
            // CONGELA A CENA (solo tocou o múon)
            animarNuvens = false;

            if (hudSucesso) {
                hudSucesso.setAttribute('value', "SUPERFÍCIE ALCANÇADA!\nContração do Espaço Comprovada.");
                hudSucesso.setAttribute('color', '#f5e60c');
                hudSucesso.emit('mostrarMsg');
            }

            setTimeout(() => {
                if (hudSucesso) hudSucesso.emit('esconderMsg');
                resetarPosicaoNuvens();
                gerenciarCicloDeFisica();
            }, 2800);
        });
    }

    function gerenciarCicloDeFisica() {
        if (timerCiclo) {
            clearTimeout(timerCiclo);
            timerCiclo = null;
        }
        if (soloEntidade && soloEntidade.parentNode) {
            soloEntidade.parentNode.removeChild(soloEntidade);
            soloEntidade = null;
        }
        if (containerDecaimento) {
            containerDecaimento.innerHTML = '';
        }

        // Descongela a animação ao iniciar o ciclo
        animarNuvens = true;

        if (modoRelativisticoAtivo) {
            if (statusPainel) {
                statusPainel.innerHTML = `1. Tempo Próprio (\\tau): 2.2 \\mu s<br>2. Distância Atmosférica: <span style="color:#87CEEB; font-weight:bold;">Contraída</span>.<br><br>A velocidade relativística encolheu o espaço. A superfície da Terra vai colidir com o Múon!`;
            }
            timerCiclo = setTimeout(() => {
                dispararSubidaDoSolo();
            }, 3000);
        } else {
            if (statusPainel) {
                statusPainel.innerHTML = `1. Tempo Próprio (\\tau): 2.2 \\mu s<br>2. Distância Atmosférica: Clássica (15km).<br><br><span style="color:#FF6347; font-weight:bold;">Decaimento Clássico:</span> O múon cai em alta velocidade pelas nuvens, mas seu tempo próprio esgota-se antes de encontrar o chão.`;
            }
            // 6 segundos completos de queda com nuvens em alta velocidade antes de congelar e decair
            timerCiclo = setTimeout(() => {
                dispararDecaimentoClassico();
            }, 8000);
        }
    }

    switchRelatividade.addEventListener('change', (event) => {
        modoRelativisticoAtivo = event.target.checked;
        gerenciarCicloDeFisica();
    });

    gerenciarCicloDeFisica();
}

/* --- ORQUESTRADOR NATIVO: CENA 5 --- */
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
    const statusPainel = document.getElementById('status-painel');
    const switchTRR = document.getElementById('switch-relatividade') || document.getElementById('switch-trr');
    
    const displayContador3D = document.getElementById('display-contador-3d');
    const lampadaDetector = document.getElementById('lampada-detector');
    const luzFlash = document.getElementById('luz-flash');

    if (!chuvaContainer || !switchTRR) return;

    let trrAtiva = false;
    let loopChuvaId = null;
    let geradorUid = 0;
    let totalMuonsDetectados = 0;

    const corMuon = '#FFB6C1';

    const DETECTOR_BOUNDS = {
        minX: -4.1,
        maxX:  4.1,
        minZ: -9.1,
        maxZ: -3.9
    };

    function registrarDetectacao() {
        totalMuonsDetectados++;

        if (displayContador3D) {
            displayContador3D.setAttribute('text', 'value', `DETECTADOS: ${totalMuonsDetectados}`);
        }

        if (lampadaDetector && luzFlash) {
            lampadaDetector.setAttribute('material', 'color', '#00FF7F');
            lampadaDetector.setAttribute('material', 'emissive', '#00FF7F');
            lampadaDetector.setAttribute('material', 'emissiveIntensity', '1.5');
            luzFlash.setAttribute('light', 'intensity', '2.5');

            setTimeout(() => {
                lampadaDetector.setAttribute('material', 'color', '#333333');
                lampadaDetector.setAttribute('material', 'emissive', '#000000');
                lampadaDetector.setAttribute('material', 'emissiveIntensity', '0');
                luzFlash.setAttribute('light', 'intensity', '0');
            }, 200);
        }
    }

    function spawnMuonCaindo() {
        if (!chuvaContainer.parentNode) return;

        const xPos = (Math.random() - 0.5) * 20; 
        const zPos = -(Math.random() * 16 + 1);

        const alturaNascimento = 25; 
        const alturaChao = 0.1;      

        let targetY = alturaChao;
        let sobreviventeEstatistico = true;

        if (!trrAtiva) {
            const sobreviveEsporadico = Math.random() < 0.05;
            if (sobreviveEsporadico) {
                targetY = alturaChao;
                sobreviventeEstatistico = true;
            } else {
                targetY = 10 + (Math.random() * 6);
                sobreviventeEstatistico = false;
            }
        } else {
            if (Math.random() < 0.5) {
                targetY = 2 + (Math.random() * 10);
                sobreviventeEstatistico = false;
            } else {
                targetY = alturaChao;
                sobreviventeEstatistico = true;
            }
        }

        const idParticula = 'm5_' + geradorUid++;
        const distanciaTotal = alturaNascimento - targetY;
        const duracaoMovimento = distanciaTotal * 130;

        const muonNode = $mk(chuvaContainer, 'a-entity', {
            id: idParticula,
            geometry: "primitive: cone; radiusBottom: 0.08; radiusTop: 0.0; height: 1.2; openEnded: true",
            position: `${xPos} ${alturaNascimento} ${zPos}`,
            rotation: "0 0 0",
            material: `shader: grad; c: ${corMuon}; transparent: true; side: double`,
            animation__queda: `property: position; to: ${xPos} ${targetY} ${zPos}; dur: ${duracaoMovimento}; easing: linear`
        });

        muonNode.addEventListener('animationcomplete__queda', () => {
            if (!sobreviventeEstatistico) {
                muonNode.setAttribute('animation__decaimento', "property: scale; to: 0 0 0; dur: 200; easing: easeInQuad");
            } else {
                muonNode.setAttribute('animation__impacto', "property: scale; to: 1 0 1; dur: 100; easing: linear");
                
                const atingiuPlaca = (
                    xPos >= DETECTOR_BOUNDS.minX &&
                    xPos <= DETECTOR_BOUNDS.maxX &&
                    zPos >= DETECTOR_BOUNDS.minZ &&
                    zPos <= DETECTOR_BOUNDS.maxZ
                );

                if (atingiuPlaca) {
                    registrarDetectacao();
                }
            }
            
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
        
        totalMuonsDetectados = 0;
        if (displayContador3D) {
            displayContador3D.setAttribute('text', 'value', 'DETECTADOS: 0');
        }

        if (trrAtiva) {
            if (statusPainel) {
                statusPainel.innerHTML = `
                    <strong>Física Relativística Ativa</strong><br>
                    <strong>Dilatação do Tempo:</strong> $t = \\gamma t_0$<br><br>
                    <span style="color:#9370DB; font-weight:bold;">Status:</span> Tempo de vida estendido pela velocidade relativística ($\\gamma \\approx 10$). Cerca de <strong>~50% dos múons alcançam o solo</strong> e acionam o detector ao atingirem sua placa sensorial.
                `;
            }
            loopChuvaId = setInterval(spawnMuonCaindo, 200);
        } else {
            if (statusPainel) {
                statusPainel.innerHTML = `
                    <strong>Física Clássica Pura</strong><br>
                    <strong>Tempo de Vida Clássico:</strong> 2.2 $\\mu$s<br><br>
                    <span style="color:#FF4500; font-weight:bold;">Status:</span> Sem dilatação temporal, quase a totalidade decai na atmosfera. Apenas uma <strong>fração esporádica (< 2%)</strong> consegue atingir o solo pela cauda probabilística do decaimento.
                `;
            }
            loopChuvaId = setInterval(spawnMuonCaindo, 350);
        }
    }

    switchTRR.addEventListener('change', (e) => {
        trrAtiva = e.target.checked;
        gerenciarCicloChuva();
    });

    gerenciarCicloChuva();
}