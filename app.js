import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDesely8LrF-5KNZEZk3p5vNB7rxJppdJw",
  authDomain: "estudo-7e80f.firebaseapp.com",
  projectId: "estudo-7e80f",
  storageBucket: "estudo-7e80f.firebasestorage.app",
  messagingSenderId: "143543444492",
  appId: "1:143543444492:web:eebf60910fbcce2513fa29",
  measurementId: "G-558MNQ3R0Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configurações do Cloudinary atualizadas
const cloudName = "pyc9deyg";
const apiKey = "258162713522641";       
const apiSecret = "vMTYMoR61vMpKMf3FryKuvVumb8"; 

let todosRecibos = [];

const listaRecibosDiv = document.getElementById('listaRecibos');
const totalRegistrosSpan = document.getElementById('totalRegistros');
const filtroBusca = document.getElementById('filtroBusca');
const btnAtualizar = document.getElementById('btnAtualizar');
const btnMapaGeral = document.getElementById('btnMapaGeral');

// Elementos do PWA
let deferredPrompt;
const btnInstalar = document.getElementById('btnInstalar');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstalar.style.display = 'flex';
});

btnInstalar.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        console.log('Usuário aceitou a instalação do PWA');
    }
    deferredPrompt = null;
    btnInstalar.style.display = 'none';
});

// Registro do Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('Service Worker registrado:', reg.scope))
            .catch((err) => console.log('Erro no Service Worker:', err));
    });
}

// Modais
const modalVisualizacao = document.getElementById('modalVisualizacao');
const modalImagemAmpliada = document.getElementById('modalImagemAmpliada');
const modalTitulo = document.getElementById('modalTitulo');
const btnFecharModal = document.getElementById('btnFecharModal');

// Modal de Detalhes
const modalDetalhes = document.getElementById('modalDetalhes');
const btnFecharModalDetalhes = document.getElementById('btnFecharModalDetalhes');

// Modal de Mapa Geral
const modalMapaGeral = document.getElementById('modalMapaGeral');
const btnFecharModalMapaGeral = document.getElementById('btnFecharModalMapaGeral');

let mapaIndividualInstance = null;
let mapaGeralInstance = null;

async function carregarRecibos() {
    listaRecibosDiv.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Buscando recibos e registros de auditoria...</p>
        </div>
    `;

    try {
        const q = query(collection(db, "recibos"), orderBy("dataHora", "desc"));
        const querySnapshot = await getDocs(q);

        todosRecibos = [];
        querySnapshot.forEach((docSnap) => {
            todosRecibos.push({ id: docSnap.id, ...docSnap.data() });
        });

        totalRegistrosSpan.innerText = todosRecibos.length;
        renderizarCards(todosRecibos);

    } catch (error) {
        console.error("Erro ao carregar recibos:", error);
        listaRecibosDiv.innerHTML = `
            <div class="empty-state" style="color: var(--danger);">
                <p>❌ Erro ao conectar ao Firebase. Verifique sua conexão ou permissões.</p>
            </div>
        `;
    }
}

function renderizarCards(dadosArray) {
    if (dadosArray.length === 0) {
        listaRecibosDiv.innerHTML = `
            <div class="empty-state">
                <p>📭 Nenhum recibo ou registro de auditoria encontrado.</p>
            </div>
        `;
        return;
    }

    listaRecibosDiv.innerHTML = "";

    dadosArray.forEach((dados) => {
        let dataFormatada = "Data indisponível";
        if (dados.dataHora && dados.dataHora.toDate) {
            dataFormatada = dados.dataHora.toDate().toLocaleString('pt-BR');
        }

        const card = document.createElement('div');
        card.className = "recibo-card animate-scale-up";

        card.innerHTML = `
            <div class="card-conteudo-clicavel" data-id="${dados.id}">
                <div class="card-top">
                    <h3 class="cliente-nome">👤 ${dados.nomeCliente || "Sem Nome"}</h3>
                    <span class="recibo-valor">R$ ${dados.valorRecibo || "0,00"}</span>
                </div>
                <div class="card-body">
                    <p><strong>CPF:</strong> ${dados.cpfCliente || "-"}</p>
                    <p><strong>Data/Hora:</strong> ${dataFormatada}</p>
                    <p><strong>Precisão GPS:</strong> <span class="badge-precisao">${Math.round(dados.precisaoGPS || 0)} metros</span></p>
                    <div class="historico-box">
                        ⚠️ <strong>Histórico / Comportamento:</strong><br>
                        ${dados.historicoComportamento || "Nenhum histórico registrado"}
                    </div>
                </div>
            </div>
            <div class="card-imagens">
                <div class="img-preview-wrapper">
                    <span>Fachada</span>
                    <img src="${dados.fotoFachada || ''}" class="thumbnail" alt="Fachada" data-url="${dados.fotoFachada || ''}" data-titulo="Foto da Fachada - ${dados.nomeCliente || ''}">
                </div>
                <div class="img-preview-wrapper">
                    <span>Assinatura</span>
                    <img src="${dados.fotoAssinatura || ''}" class="thumbnail" alt="Assinatura" data-url="${dados.fotoAssinatura || ''}" data-titulo="Assinatura Digital - ${dados.nomeCliente || ''}">
                </div>
            </div>
        `;

        listaRecibosDiv.appendChild(card);
    });

    document.querySelectorAll('.card-conteudo-clicavel').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('thumbnail')) return;
            const id = el.getAttribute('data-id');
            const recibo = todosRecibos.find(r => r.id === id);
            if (recibo) {
                abrirModalDetalhes(recibo);
            }
        });
    });

    document.querySelectorAll('.thumbnail').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = e.target.getAttribute('data-url');
            const titulo = e.target.getAttribute('data-titulo');
            if (url) {
                modalImagemAmpliada.src = url;
                modalTitulo.innerText = titulo;
                modalVisualizacao.style.display = 'flex';
            }
        });
    });
}

function abrirModalDetalhes(dados) {
    let dataFormatada = "Data indisponível";
    if (dados.dataHora && dados.dataHora.toDate) {
        dataFormatada = dados.dataHora.toDate().toLocaleString('pt-BR');
    }

    document.getElementById('detalheNome').innerText = dados.nomeCliente || "-";
    document.getElementById('detalheCpf').innerText = dados.cpfCliente || "-";
    document.getElementById('detalheValor').innerText = dados.valorRecibo || "0,00";
    document.getElementById('detalheDataHora').innerText = dataFormatada;

    document.getElementById('detalheLat').innerText = dados.latitude ?? "N/A";
    document.getElementById('detalheLon').innerText = dados.longitude ?? "N/A";
    document.getElementById('detalhePrecisao').innerText = Math.round(dados.precisaoGPS || 0);
    document.getElementById('detalheTempo').innerText = dados.tempoBuscandoGPS ?? "0";
    document.getElementById('detalheLeituras').innerText = dados.quantidadeLeiturasGPS ?? "0";
    document.getElementById('detalheStatusGPS').innerText = dados.statusLocalizacao || "Registrado";

    document.getElementById('detalheHistorico').innerText = dados.historicoComportamento || "Nenhum histórico registrado";

    const btnGoogleMaps = document.getElementById('btnAbrirGoogleMaps');
    if (dados.latitude !== undefined && dados.longitude !== undefined && dados.latitude !== null && dados.longitude !== null) {
        btnGoogleMaps.href = `https://www.google.com/maps/search/?api=1&query=${dados.latitude},${dados.longitude}`;
        btnGoogleMaps.style.display = 'inline-flex';
    } else {
        btnGoogleMaps.style.display = 'none';
    }

    const imgFachada = document.getElementById('imgFachadaDetalhe');
    const imgAssinatura = document.getElementById('imgAssinaturaDetalhe');

    imgFachada.src = dados.fotoFachada || '';
    imgFachada.onclick = () => {
        modalImagemAmpliada.src = dados.fotoFachada || '';
        modalTitulo.innerText = `Foto da Fachada - ${dados.nomeCliente || ''}`;
        modalVisualizacao.style.display = 'flex';
    };

    imgAssinatura.src = dados.fotoAssinatura || '';
    imgAssinatura.onclick = () => {
        modalImagemAmpliada.src = dados.fotoAssinatura || '';
        modalTitulo.innerText = `Assinatura Digital - ${dados.nomeCliente || ''}`;
        modalVisualizacao.style.display = 'flex';
    };

    modalDetalhes.style.display = 'flex';

    setTimeout(() => {
        const lat = dados.latitude;
        const lon = dados.longitude;

        if (lat !== undefined && lon !== undefined && lat !== null && lon !== null) {
            if (mapaIndividualInstance) {
                mapaIndividualInstance.remove();
                mapaIndividualInstance = null;
            }

            mapaIndividualInstance = L.map('mapaIndividual').setView([lat, lon], 17);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapaIndividualInstance);

            L.marker([lat, lon]).addTo(mapaIndividualInstance)
                .bindPopup(`<b>${dados.nomeCliente}</b><br>Precisão: ${Math.round(dados.precisaoGPS || 0)}m`)
                .openPopup();
        } else {
            document.getElementById('mapaIndividual').innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;">Coordenadas GPS não disponíveis para este registro.</div>`;
        }
    }, 300);

    let btnExcluir = document.getElementById('btnExcluirRecibo');
    
    if (!btnExcluir) {
        const gpsBox = document.querySelector('.gps-highlight-box');
        if (gpsBox) {
            btnExcluir = document.createElement('button');
            btnExcluir.id = 'btnExcluirRecibo';
            btnExcluir.className = 'btn-excluir-recibo';
            btnExcluir.innerHTML = '🗑️ Excluir Recibo e Imagens';
            gpsBox.appendChild(btnExcluir);
        }
    }

    if (btnExcluir) {
        const novoBtnExcluir = btnExcluir.cloneNode(true);
        btnExcluir.parentNode.replaceChild(novoBtnExcluir, btnExcluir);

        novoBtnExcluir.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja excluir permanentemente o recibo de ${dados.nomeCliente || 'este cliente'} e suas fotos do Cloudinary?`)) {
                try {
                    novoBtnExcluir.innerText = "Excluindo mídias...";
                    novoBtnExcluir.disabled = true;

                    if (dados.publicIdFachada) {
                        await deletarImagemCloudinary(dados.publicIdFachada);
                    }

                    if (dados.publicIdAssinatura) {
                        await deletarImagemCloudinary(dados.publicIdAssinatura);
                    }

                    novoBtnExcluir.innerText = "Removendo do banco...";

                    await deleteDoc(doc(db, "recibos", dados.id));

                    alert("Recibo e imagens excluídos com sucesso!");
                    modalDetalhes.style.display = 'none';
                    carregarRecibos();

                } catch (error) {
                    console.error("Erro ao excluir:", error);
                    alert("Ocorreu um erro ao excluir os registros. Verifique o console.");
                    novoBtnExcluir.innerText = "🗑️ Excluir Recibo e Imagens";
                    novoBtnExcluir.disabled = false;
                }
            }
        });
    }
}

async function deletarImagemCloudinary(publicId) {
    if (!publicId) return;
    
    const timestamp = Math.floor(Date.now() / 1000);
    const stringParaAssinar = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(stringParaAssinar);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        body: formData
    });
    
    return await response.json();
}

btnMapaGeral.addEventListener('click', () => {
    modalMapaGeral.style.display = 'flex';

    setTimeout(() => {
        if (mapaGeralInstance) {
            mapaGeralInstance.remove();
            mapaGeralInstance = null;
        }

        mapaGeralInstance = L.map('mapaGeral').setView([-15.788497, -47.879873], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapaGeralInstance);

        let marcadoresValidos = 0;
        let bounds = L.latLngBounds();

        todosRecibos.forEach(dados => {
            if (dados.latitude !== undefined && dados.longitude !== undefined && dados.latitude !== null && dados.longitude !== null) {
                marcadoresValidos++;
                const latLng = [dados.latitude, dados.longitude];
                
                bounds.extend(latLng);

                const foto = dados.fotoFachada || 'https://via.placeholder.com/50';
                const precisao = Math.round(dados.precisaoGPS || 0);

                const customIcon = L.divIcon({
                    html: `
                        <div class="marcador-cliente-wrapper">
                            <img src="${foto}" class="marcador-cliente-img" alt="Fachada">
                            <span class="marcador-cliente-badge">${precisao}m</span>
                        </div>
                    `,
                    className: "marcador-cliente-custom",
                    iconSize: [50, 50],
                    iconAnchor: [25, 25]
                });

                const marker = L.marker(latLng, { icon: customIcon }).addTo(mapaGeralInstance);
                
                const popupContent = `
                    <div style="text-align:center; font-family: Inter, sans-serif;">
                        <b>👤 ${dados.nomeCliente}</b><br>
                        <span style="font-size: 12px; color: #475569;">📍 Precisão: ${precisao} metros</span><br>
                        <span style="font-size: 11px; color: #64748b;">R$ ${dados.valorRecibo || "0,00"}</span><br>
                        <img src="${foto}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 6px; margin-top: 6px;" alt="Fachada">
                    </div>
                `;
                marker.bindPopup(popupContent);
            }
        });

        if (marcadoresValidos > 0) {
            if (marcadoresValidos === 1) {
                mapaGeralInstance.setView(bounds.getCenter(), 16);
            } else {
                mapaGeralInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
        } else {
            alert("Nenhum registro possui coordenadas GPS válidas para exibir no mapa geral.");
        }
    }, 300);
});

filtroBusca.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    const filtrados = todosRecibos.filter(item => {
        const nome = (item.nomeCliente || "").toLowerCase();
        const cpf = (item.cpfCliente || "").toLowerCase();
        return nome.includes(termo) || cpf.includes(termo);
    });
    renderizarCards(filtrados);
});

btnAtualizar.addEventListener('click', carregarRecibos);

btnFecharModal.addEventListener('click', () => {
    modalVisualizacao.style.display = 'none';
    modalImagemAmpliada.src = "";
});

btnFecharModalDetalhes.addEventListener('click', () => {
    modalDetalhes.style.display = 'none';
    if (mapaIndividualInstance) {
        mapaIndividualInstance.remove();
        mapaIndividualInstance = null;
    }
});

btnFecharModalMapaGeral.addEventListener('click', () => {
    modalMapaGeral.style.display = 'none';
    if (mapaGeralInstance) {
        mapaGeralInstance.remove();
        mapaGeralInstance = null;
    }
});

window.addEventListener('click', (e) => {
    if (e.target === modalVisualizacao) {
        modalVisualizacao.style.display = 'none';
        modalImagemAmpliada.src = "";
    }
    if (e.target === modalDetalhes) {
        modalDetalhes.style.display = 'none';
        if (mapaIndividualInstance) {
            mapaIndividualInstance.remove();
            mapaIndividualInstance = null;
        }
    }
    if (e.target === modalMapaGeral) {
        modalMapaGeral.style.display = 'none';
        if (mapaGeralInstance) {
            mapaGeralInstance.remove();
            mapaGeralInstance = null;
        }
    }
});

carregarRecibos();
