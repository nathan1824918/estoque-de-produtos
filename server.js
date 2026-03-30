const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const ARQUIVO_PRODUTOS = path.join(__dirname, 'produtos.json');

app.use(express.json());

function lerProdutos() {
  const dados = fs.readFileSync(ARQUIVO_PRODUTOS, 'utf-8');
  return JSON.parse(dados);
}

function salvarProdutos(produtos) {
  fs.writeFileSync(ARQUIVO_PRODUTOS, JSON.stringify(produtos, null, 2), 'utf-8');
}

function gerarNovoId(produtos) {
  if (produtos.length === 0) return 1;
  return Math.max(...produtos.map((p) => p.id)) + 1;
}

function validarProduto(corpo, parcial = false) {
  const erros = [];

  if (!parcial) {
    if (!corpo.nome || typeof corpo.nome !== 'string' || corpo.nome.trim() === '') {
      erros.push('"nome" é obrigatório e deve ser uma string não vazia.');
    }
    if (corpo.preco === undefined || typeof corpo.preco !== 'number' || corpo.preco < 0) {
      erros.push('"preco" é obrigatório e deve ser um número maior ou igual a 0.');
    }
    if (corpo.quantidade === undefined || typeof corpo.quantidade !== 'number' || !Number.isInteger(corpo.quantidade) || corpo.quantidade < 0) {
      erros.push('"quantidade" é obrigatória e deve ser um inteiro maior ou igual a 0.');
    }
  } else {
    if (corpo.nome !== undefined && (typeof corpo.nome !== 'string' || corpo.nome.trim() === '')) {
      erros.push('"nome" deve ser uma string não vazia.');
    }
    if (corpo.preco !== undefined && (typeof corpo.preco !== 'number' || corpo.preco < 0)) {
      erros.push('"preco" deve ser um número maior ou igual a 0.');
    }
    if (corpo.quantidade !== undefined && (typeof corpo.quantidade !== 'number' || !Number.isInteger(corpo.quantidade) || corpo.quantidade < 0)) {
      erros.push('"quantidade" deve ser um inteiro maior ou igual a 0.');
    }
  }

  return { valido: erros.length === 0, erros };
}

app.get('/produtos', (req, res) => {
  try {
    const produtos = lerProdutos();
    res.status(200).json({
      sucesso: true,
      total: produtos.length,
      dados: produtos,
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao ler os produtos.', erro: erro.message });
  }
});

app.get('/produtos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID inválido. Deve ser um número inteiro.' });
    }

    const produtos = lerProdutos();
    const produto = produtos.find((p) => p.id === id);

    if (!produto) {
      return res.status(404).json({ sucesso: false, mensagem: `Produto com ID ${id} não encontrado.` });
    }

    res.status(200).json({ sucesso: true, dados: produto });
  } catch (erro) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar o produto.', erro: erro.message });
  }
});

app.post('/produtos', (req, res) => {
  try {
    const corpo = req.body;
    const { valido, erros } = validarProduto(corpo);

    if (!valido) {
      return res.status(400).json({ sucesso: false, mensagem: 'Dados inválidos.', erros });
    }

    const produtos = lerProdutos();

    const novoProduto = {
      id: gerarNovoId(produtos),
      nome: corpo.nome.trim(),
      categoria: corpo.categoria ? corpo.categoria.trim() : null,
      preco: corpo.preco,
      quantidade: corpo.quantidade,
    };

    produtos.push(novoProduto);
    salvarProdutos(produtos);

    res.status(201).json({ sucesso: true, mensagem: 'Produto cadastrado com sucesso.', dados: novoProduto });
  } catch (erro) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao cadastrar o produto.', erro: erro.message });
  }
});

app.put('/produtos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID inválido. Deve ser um número inteiro.' });
    }

    const corpo = req.body;

    if (Object.keys(corpo).length === 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nenhum campo enviado para atualização.' });
    }

    const { valido, erros } = validarProduto(corpo, true);

    if (!valido) {
      return res.status(400).json({ sucesso: false, mensagem: 'Dados inválidos.', erros });
    }

    const produtos = lerProdutos();
    const indice = produtos.findIndex((p) => p.id === id);

    if (indice === -1) {
      return res.status(404).json({ sucesso: false, mensagem: `Produto com ID ${id} não encontrado.` });
    }

    const produtoAtualizado = {
      ...produtos[indice],
      ...(corpo.nome !== undefined && { nome: corpo.nome.trim() }),
      ...(corpo.categoria !== undefined && { categoria: corpo.categoria.trim() }),
      ...(corpo.preco !== undefined && { preco: corpo.preco }),
      ...(corpo.quantidade !== undefined && { quantidade: corpo.quantidade }),
    };

    produtos[indice] = produtoAtualizado;
    salvarProdutos(produtos);

    res.status(200).json({ sucesso: true, mensagem: 'Produto atualizado com sucesso.', dados: produtoAtualizado });
  } catch (erro) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar o produto.', erro: erro.message });
  }
});

app.delete('/produtos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID inválido. Deve ser um número inteiro.' });
    }

    const produtos = lerProdutos();
    const indice = produtos.findIndex((p) => p.id === id);

    if (indice === -1) {
      return res.status(404).json({ sucesso: false, mensagem: `Produto com ID ${id} não encontrado.` });
    }

    const [produtoRemovido] = produtos.splice(indice, 1);
    salvarProdutos(produtos);

    res.status(200).json({ sucesso: true, mensagem: 'Produto removido com sucesso.', dados: produtoRemovido });
  } catch (erro) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover o produto.', erro: erro.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ sucesso: false, mensagem: `Rota "${req.method} ${req.path}" não existe.` });
});

app.listen(PORT, () => {
  console.log(`\n🚀 API de Estoque rodando em http://localhost:${PORT}`);
  console.log('\nEndpoints disponíveis:');
  console.log(`  GET    http://localhost:${PORT}/produtos`);
  console.log(`  GET    http://localhost:${PORT}/produtos/:id`);
  console.log(`  POST   http://localhost:${PORT}/produtos`);
  console.log(`  PUT    http://localhost:${PORT}/produtos/:id`);
  console.log(`  DELETE http://localhost:${PORT}/produtos/:id\n`);
});
