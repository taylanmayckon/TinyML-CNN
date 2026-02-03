import React, { useState, useEffect, useRef } from 'react';
// import mqtt from 'mqtt'; // REMOVIDO: Carregamento via CDN para evitar erro de build
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Wifi, Activity, Database, Play, RotateCcw, CheckCircle, XCircle } from 'lucide-react';

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// =================================================================================
// BANCO DE DADOS DE IMAGENS DE TESTE
// =================================================================================
const TEST_DATASET = [
  {
    id: 1,
    label: 7,
    description: "Dígito 7",
    // Exemplo real de vetor 28x28
    vector: [
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,187,255,255,140,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,45,255,255,255,140,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,135,255,255,255,25,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,188,255,255,130,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,188,255,255,130,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,188,255,255,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,150,255,255,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,100,255,255,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,50,255,255,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,255,255,100,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,150,255,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,50,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,200,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,100,255,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,50,255,100,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,255,150,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,200,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,100,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,50,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
    ]
  },
  { id: 2, label: 0, description: "Dígito 0", vector: new Array(784).fill(0) }, // Placeholder
  { id: 3, label: 1, description: "Dígito 1", vector: new Array(784).fill(0) }, // Placeholder
  { id: 4, label: 2, description: "Dígito 2", vector: new Array(784).fill(0) }, // Placeholder
  { id: 5, label: 3, description: "Dígito 3", vector: new Array(784).fill(0) }, // Placeholder
  { id: 6, label: 4, description: "Dígito 4", vector: new Array(784).fill(0) }, // Placeholder
  { id: 7, label: 5, description: "Dígito 5", vector: new Array(784).fill(0) }, // Placeholder
  { id: 8, label: 8, description: "Dígito 8", vector: new Array(784).fill(0) }, // Placeholder
  { id: 9, label: 9, description: "Dígito 9", vector: new Array(784).fill(0) }, // Placeholder
];

// =================================================================================
// COMPONENTE PRINCIPAL
// =================================================================================
const App = () => {
  // --- Estados do MQTT ---
  const [client, setClient] = useState(null);
  const [connectStatus, setConnectStatus] = useState('Desconectado');
  const [brokerUrl, setBrokerUrl] = useState('ws://localhost:8888'); // Porta WebSocket 
  
  // --- Estados da Aplicação ---
  const [selectedImage, setSelectedImage] = useState(TEST_DATASET[0]);
  const [inferenceResult, setInferenceResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mqttLoaded, setMqttLoaded] = useState(false);
  
  // --- Matriz de Confusão (10x10 preenchida com 0) ---
  const [confusionMatrix, setConfusionMatrix] = useState(
    Array(10).fill().map(() => Array(10).fill(0))
  );

  // --- Efeito para Carregar MQTT via CDN (Bypass Build Error) ---
  useEffect(() => {
    if (!window.mqtt) {
      const script = document.createElement('script');
      script.src = "https://unpkg.com/mqtt/dist/mqtt.min.js";
      script.async = true;
      script.onload = () => setMqttLoaded(true);
      document.body.appendChild(script);
    } else {
      setMqttLoaded(true);
    }
  }, []);

  // --- Conexão MQTT ---
  const mqttConnect = () => {
    if (!window.mqtt) {
      return;
    }

    // Se já estiver conectado, não faz nada (para evitar loops)
    if (client) return;

    setConnectStatus('Conectando...');
    
    // Tenta conectar
    const mqttClient = window.mqtt.connect(brokerUrl, {
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    mqttClient.on('connect', () => {
      console.log("MQTT Conectado!");
      setConnectStatus('Conectado');
      // CORRIGIDO: Removida a barra dupla // para /
      mqttClient.subscribe('tinyml-cnn/resultado', (err) => {
        if (!err) console.log('Inscrito em tinyml-cnn/resultado');
        else console.error('Erro inscricao:', err);
      });
    });

    mqttClient.on('error', (err) => {
      console.error('Erro Conexão MQTT:', err);
      setConnectStatus('Erro');
      // Não encerra o client para permitir reconexão automática
    });
    
    mqttClient.on('close', () => {
       if(connectStatus === 'Conectado') setConnectStatus('Desconectado');
    });

    mqttClient.on('message', (topic, message) => {
      // CORRIGIDO: Removida a barra dupla // para /
      if (topic === 'tinyml-cnn/resultado') {
        try {
          const data = JSON.parse(message.toString());
          console.log("Recebido resultado:", data);
          handleInferenceReceived(data);
        } catch (e) {
          console.error("Erro parse JSON:", e);
        }
      }
    });

    setClient(mqttClient);
  };

  // Efeito para Conexão Automática
  useEffect(() => {
    if (mqttLoaded && !client) {
      mqttConnect();
    }
  }, [mqttLoaded]);

  useEffect(() => {
    if (client) return () => client.end();
  }, [client]);

  // --- Lógica de Envio e Recebimento ---
  const handleSendAndInfer = async () => {
    if (!client || connectStatus !== 'Conectado') {
      alert("Aguardando conexão MQTT...");
      return;
    }

    setLoading(true);
    setInferenceResult(null);

    // 1. Enviar Vetor de Imagem (Binário)
    const payload = new Uint8Array(selectedImage.vector);
    
    // CORRIGIDO: Removida a barra dupla // para /
    client.publish('tinyml-cnn/vetor_imagem', payload, { qos: 0, retain: false });

    // Delay pequeno para o Pico processar o buffer (segurança)
    setTimeout(() => {
      // 2. Enviar Comando de Inferência
      // CORRIGIDO: Removida a barra dupla // para /
      client.publish('tinyml-cnn/rodarcnn', 'GO', { qos: 0, retain: false });
    }, 200);
  };

  const handleInferenceReceived = (data) => {
    setLoading(false);
    setInferenceResult(data);
    
    // Atualizar Matriz de Confusão
    // Linha: Real (selectedImage.label), Coluna: Predito (data.classe)
    const realLabel = selectedImage.label;
    const predLabel = data.classe;

    setConfusionMatrix(prevMatrix => {
      const newMatrix = prevMatrix.map(row => [...row]); // Deep copy simples
      newMatrix[realLabel][predLabel] += 1;
      return newMatrix;
    });
  };

  const handleClearMatrix = () => {
    setConfusionMatrix(Array(10).fill().map(() => Array(10).fill(0)));
  };

  // --- Renderização do Canvas (Preview da Imagem) ---
  const canvasRef = useRef(null);
  useEffect(() => {
    if (canvasRef.current && selectedImage) {
      const ctx = canvasRef.current.getContext('2d');
      const imgData = ctx.createImageData(28, 28);
      // Preencher pixels
      for (let i = 0; i < selectedImage.vector.length; i++) {
        const pixelVal = selectedImage.vector[i];
        imgData.data[i * 4 + 0] = pixelVal; // R
        imgData.data[i * 4 + 1] = pixelVal; // G
        imgData.data[i * 4 + 2] = pixelVal; // B
        imgData.data[i * 4 + 3] = 255;      // Alpha
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }, [selectedImage]);

  // --- Configuração do Gráfico ---
  const chartData = {
    labels: ['Confiança'],
    datasets: [
      {
        label: `Probabilidade da Classe ${inferenceResult?.classe ?? '?'}`,
        data: inferenceResult ? [inferenceResult.conf * 100] : [0],
        backgroundColor: inferenceResult?.conf > 0.8 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)',
      },
    ],
  };

  return (
    <div className="h-screen w-full bg-gray-900 text-white font-sans p-4 flex flex-col overflow-hidden">
      
      {/* Header - Fixo no Topo */}
      <div className="flex-none flex justify-between items-center mb-4 bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
        <div className="flex items-center gap-3">
          <Activity className="text-blue-400 w-8 h-8" />
          <h1 className="text-2xl font-bold">TinyML-CNN Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            value={brokerUrl} 
            onChange={(e) => setBrokerUrl(e.target.value)}
            className="bg-gray-700 text-sm p-2 rounded border border-gray-600 w-64 focus:outline-none focus:border-blue-500"
            placeholder="ws://localhost:8888"
          />
          {/* Status Badge (Automatico) */}
          <div 
            className={`flex items-center gap-2 px-4 py-2 rounded font-bold transition select-none ${
              connectStatus === 'Conectado' ? 'bg-green-600' : 
              connectStatus === 'Erro' ? 'bg-red-600' : 'bg-blue-600'
            } ${!mqttLoaded ? 'opacity-50' : ''}`}
          >
            <Wifi className="w-4 h-4" />
            {connectStatus}
          </div>
        </div>
      </div>

      {/* Grid Principal - Ocupa o restante da tela */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        
        {/* COLUNA 1: Seletor de Imagens */}
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 flex flex-col h-full overflow-hidden">
          <h2 className="text-xl font-bold mb-4 flex-none flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" /> Banco de Teste
          </h2>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {TEST_DATASET.map((img) => (
              <div 
                key={img.id}
                onClick={() => setSelectedImage(img)}
                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition ${
                  selectedImage.id === img.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div>
                  <div className="font-bold">ID: {img.id}</div>
                  <div className="text-xs text-gray-300">{img.description}</div>
                </div>
                <div className="bg-gray-900 w-8 h-8 flex items-center justify-center rounded font-mono text-yellow-400">
                  {img.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA 2: Preview e Ação */}
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 flex flex-col h-full overflow-hidden">
          <h2 className="text-xl font-bold mb-4 flex-none">Preview e Inferência</h2>
          
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <div className="relative group">
              <canvas 
                ref={canvasRef} 
                width={28} 
                height={28} 
                className="w-56 h-56 bg-black border-4 border-gray-600 rounded-lg shadow-2xl"
                style={{ imageRendering: 'pixelated' }} 
              />
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow">
                Real: {selectedImage.label}
              </div>
            </div>

            <button 
              onClick={handleSendAndInfer}
              disabled={loading || connectStatus !== 'Conectado'}
              className={`w-3/4 py-4 rounded-lg font-bold text-lg flex justify-center items-center gap-2 shadow-lg transition transform active:scale-95 ${
                loading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500'
              }`}
            >
              {loading ? <RotateCcw className="animate-spin" /> : <Play fill="currentColor" />}
              {loading ? 'Processando...' : 'Enviar e Inferir'}
            </button>
          </div>

          {/* Resultado (Parte inferior da coluna central) */}
          <div className="flex-none mt-4 w-full bg-gray-900 p-4 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">Predição Atual:</span>
                <span className={`text-2xl font-bold ${
                  inferenceResult?.classe === selectedImage.label ? 'text-green-400' : (inferenceResult ? 'text-red-400' : 'text-gray-500')
                }`}>
                  {inferenceResult ? inferenceResult.classe : '--'}
                </span>
              </div>
              <div className="h-24 w-full">
                <Bar 
                   options={{
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: { legend: { display: false } },
                     scales: { y: { min: 0, max: 100, grid: { color: '#374151'} }, x: { grid: { display: false } } }
                   }}
                   data={chartData} 
                />
              </div>
          </div>
        </div>

        {/* COLUNA 3: Matriz de Confusão */}
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-4 flex-none">
             <h2 className="text-xl font-bold">Matriz de Confusão</h2>
             <button onClick={handleClearMatrix} className="text-xs text-red-400 hover:text-red-300 border border-red-900 px-2 py-1 rounded hover:bg-red-900/30">Limpar Dados</button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center overflow-auto">
            <div className="w-full max-w-[320px]">
              {/* Labels Superiores (Predito) */}
              <div className="flex mb-1 pl-6">
                 <div className="w-full text-center text-[10px] text-gray-400 uppercase tracking-widest">Classe Predita</div>
              </div>
              
              <div className="grid grid-cols-11 gap-1 text-xs">
                {/* Canto Vazio (Top-Left) */}
                <div className="flex items-center justify-center text-[10px] text-gray-500 -rotate-90 origin-center h-full">Real</div>
                
                {/* Cabeçalho 0-9 */}
                {[0,1,2,3,4,5,6,7,8,9].map(n => (
                  <div key={n} className="text-center font-bold text-gray-400">{n}</div>
                ))}
                
                {/* Linhas da Matriz */}
                {confusionMatrix.map((row, i) => (
                  <React.Fragment key={i}>
                    {/* Label Lateral (Real) */}
                    <div className="flex items-center justify-center font-bold text-gray-400">{i}</div>
                    
                    {/* Células */}
                    {row.map((val, j) => {
                      let bgClass = 'bg-gray-900';
                      let textClass = 'text-gray-600';
                      
                      if (val > 0) {
                        textClass = 'text-white font-bold';
                        if (i === j) {
                          bgClass = `bg-green-600`; 
                        } else {
                          bgClass = `bg-red-600`;
                        }
                      }
                      return (
                        <div 
                          key={`${i}-${j}`} 
                          className={`aspect-square flex items-center justify-center rounded-sm ${bgClass} ${textClass} border border-gray-700/30 text-[10px]`}
                        >
                          {val > 0 ? val : ''}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-none mt-4 flex gap-4 text-xs justify-center">
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-600 rounded"></div> Acertos</div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-600 rounded"></div> Erros</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;