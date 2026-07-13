/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState } from "../types";

export const INITIAL_STATE: AppState = {
  users: [
    {
      id: "u1",
      nomeCompleto: "Carlos Eduardo Silva",
      email: "carlos@meuposto.com",
      senhaCriptografada: "carlos123",
      cpf: "123.456.789-00",
      cargo: "Master",
      cnpjPosto: "12.345.678/0001-99",
      telefone: "(11) 98765-4321",
    },
    {
      id: "u2",
      nomeCompleto: "Mariana Costa Santos",
      email: "mariana@meuposto.com",
      senhaCriptografada: "mariana123",
      cpf: "987.654.321-11",
      cargo: "Gerente",
      cnpjPosto: "12.345.678/0001-99",
      telefone: "(11) 91234-5678",
    },
    {
      id: "u3",
      nomeCompleto: "Marcos Souza Lima",
      email: "marcos@meuposto.com",
      senhaCriptografada: "marcos123",
      cpf: "111.222.333-44",
      cargo: "Frentista",
      cnpjPosto: "12.345.678/0001-99",
      telefone: "(11) 95555-4444",
    },
  ],
  tanks: [
    {
      id: "t1",
      identificador: "Tanque 01 - Gasolina Comum",
      combustivel: "Gasolina Comum",
      capacidadeMaxima: 15000,
      volumeAtual: 10500,
      pontoCriticoAlerta: 2500,
      observacoes: "Última limpeza interna realizada em março de 2026. Filtros em ótimo estado.",
    },
    {
      id: "t2",
      identificador: "Tanque 02 - Gasolina Aditivada",
      combustivel: "Gasolina Aditivada",
      capacidadeMaxima: 10000,
      volumeAtual: 4200,
      pontoCriticoAlerta: 2000,
      observacoes: "Manutenção preventiva agendada para 20/07/2026 para drenar condensação.",
    },
    {
      id: "t3",
      identificador: "Tanque 03 - Etanol Hidratado",
      combustivel: "Etanol",
      capacidadeMaxima: 15000,
      volumeAtual: 12000,
      pontoCriticoAlerta: 2500,
      observacoes: "Abastecimento recente feito com laudo 100% conforme portaria ANP.",
    },
    {
      id: "t4",
      identificador: "Tanque 04 - Diesel S10",
      combustivel: "Diesel S10",
      capacidadeMaxima: 20000,
      volumeAtual: 14500,
      pontoCriticoAlerta: 3000,
      observacoes: "Válvulas e sensores de telemetria sem nenhuma ocorrência.",
    },
    {
      id: "t5",
      identificador: "Tanque 05 - Diesel S500",
      combustivel: "Diesel S500",
      capacidadeMaxima: 10000,
      volumeAtual: 1500, // Trigger warning
      pontoCriticoAlerta: 2000,
      observacoes: "ATENÇÃO: Nível crítico de estoque. Solicitar pedido urgente à distribuidora.",
    },
  ],
  nozzles: [
    {
      id: "b1",
      numeroBico: "Bico 01 - GC",
      bombaAssociada: "Bomba Principal A",
      tanqueId: "t1",
      encerranteInicial: 124500,
      precoPorLitro: 5.89,
    },
    {
      id: "b2",
      numeroBico: "Bico 02 - GA",
      bombaAssociada: "Bomba Principal A",
      tanqueId: "t2",
      encerranteInicial: 89320,
      precoPorLitro: 6.09,
    },
    {
      id: "b3",
      numeroBico: "Bico 03 - ET",
      bombaAssociada: "Bomba Principal B",
      tanqueId: "t3",
      encerranteInicial: 215400,
      precoPorLitro: 3.99,
    },
    {
      id: "b4",
      numeroBico: "Bico 04 - DS10",
      bombaAssociada: "Bomba Principal B",
      tanqueId: "t4",
      encerranteInicial: 341200,
      precoPorLitro: 5.79,
    },
  ],
  shifts: [
    {
      id: "s1",
      data: "2026-07-12",
      turno: "Turno A (Manhã)",
      frentistaResponsavel: "Marcos Souza Lima",
      checklist: {
        limpezaPistas: true,
        usoEPIs: true,
        afericaoEquipamentosSeguranca: true,
        testeGerador: true,
      },
      status: "Fechado",
    },
    {
      id: "s2",
      data: "2026-07-13",
      turno: "Turno A (Manhã)",
      frentistaResponsavel: "Marcos Souza Lima",
      checklist: {
        limpezaPistas: true,
        usoEPIs: true,
        afericaoEquipamentosSeguranca: true,
        testeGerador: false, // generator test pending
      },
      status: "Em Andamento",
    },
  ],
  transactions: [
    // Historical Turn s1 completed transactions
    {
      id: "tx1",
      shiftId: "s1",
      tipo: "Receita",
      categoria: "Combustíveis",
      descricao: "Venda Gasolina Comum (120 litros via Bico 01)",
      valor: 706.8,
      formaPagamento: "PIX",
      data: "2026-07-12T09:15",
    },
    {
      id: "tx2",
      shiftId: "s1",
      tipo: "Receita",
      categoria: "Conveniência",
      descricao: "Vendas Loja de Conveniência Manhã",
      valor: 345.5,
      formaPagamento: "Cartão de Crédito",
      data: "2026-07-12T11:40",
    },
    {
      id: "tx3",
      shiftId: "s1",
      tipo: "Despesa",
      categoria: "Despesas Operacionais",
      descricao: "Compra de material de limpeza emergencial",
      valor: 85.0,
      formaPagamento: "Dinheiro",
      data: "2026-07-12T10:00",
    },
    {
      id: "tx4",
      shiftId: "s1",
      tipo: "Receita",
      categoria: "Serviços (Troca de Óleo / Ducha)",
      descricao: "Serviço Completo de Troca de Óleo SUV",
      valor: 280.0,
      formaPagamento: "Cartão de Débito",
      data: "2026-07-12T10:30",
    },
  ],
  nozzleClosings: [
    {
      id: "nc1",
      shiftId: "s1",
      nozzleId: "b1",
      encerranteFinal: 124620, // 120 Liters sold
      litrosVendidos: 120,
      valorVendidoCalculado: 706.8,
    },
    {
      id: "nc2",
      shiftId: "s1",
      nozzleId: "b2",
      encerranteFinal: 89370, // 50 Liters sold
      litrosVendidos: 50,
      valorVendidoCalculado: 304.5,
    },
  ],
  reconciliations: [
    {
      id: "r1",
      shiftId: "s1",
      frentistaId: "u3",
      frentistaNome: "Marcos Souza Lima",
      valorDeclaradoFisico: 1235.8, // GC (706.8) + GA (304.5) + Conveniência (345.5) + Serviços (280) - Despesas (85) = 1551.8. Let's say we only counted 1535.8 BRL in physical, or similar.
      valorCalculadoTeorico: 1251.8, // 706.8 + 304.5 + 345.5 + 280 - 85 - wait, wait. Let's make it easy:
      diferenca: -16.0, // short of 16 BRL!
      observacoes: "Diferença devido a troco incorreto em venda em dinheiro.",
      dataFechamento: "2026-07-12T12:15:00Z",
    },
  ],
  calibrations: [
    {
      id: "c1",
      data: "2026-07-11",
      nozzleId: "b1",
      volumeMedido: 19.98,
      desvioMl: -20, // -20ml
      conforme: true,
      operadorResponsavel: "Mariana Costa Santos",
    },
    {
      id: "c2",
      data: "2026-07-12",
      nozzleId: "b2",
      volumeMedido: 20.07,
      desvioMl: 70, // +70ml (Fail!)
      conforme: false,
      operadorResponsavel: "Mariana Costa Santos",
    },
  ],
  qualityAudits: [
    {
      id: "q1",
      data: "2026-07-12",
      combustivel: "Gasolina Comum",
      densidade: 0.742,
      temperatura: 23.5,
      teorEtanol: 27, // ANP standard limit
      aspectoVisual: "Límpido e Isento",
      presencaImpurezas: false,
      conforme: true,
      responsavelTecnico: "Carlos Eduardo Silva",
    },
    {
      id: "q2",
      data: "2026-07-13",
      combustivel: "Gasolina Aditivada",
      densidade: 0.745,
      temperatura: 24.0,
      teorEtanol: 29, // Too high (ANP maximum is 27%)
      aspectoVisual: "Límpido e Isento",
      presencaImpurezas: false,
      conforme: false,
      responsavelTecnico: "Carlos Eduardo Silva",
    },
  ],
  lmc: [
    {
      id: "l1",
      date: "2026-07-01",
      fuelType: "Gasolina Comum",
      openingStock: 12500,
      deliveryVolume: 0,
      litersSold: 2450,
      physicalStock: 10042,
      stationCnpj: "12.345.678/0001-99"
    },
    {
      id: "l2",
      date: "2026-07-02",
      fuelType: "Gasolina Comum",
      openingStock: 10042,
      deliveryVolume: 10000,
      litersSold: 2600,
      physicalStock: 17447,
      stationCnpj: "12.345.678/0001-99"
    },
    {
      id: "l3",
      date: "2026-07-01",
      fuelType: "Diesel S10",
      openingStock: 18000,
      deliveryVolume: 0,
      litersSold: 3100,
      physicalStock: 14896,
      stationCnpj: "12.345.678/0001-99"
    }
  ],
  appointments: [
    {
      id: "a1",
      title: "Inspeção de Vendas do INMETRO",
      date: "2026-07-15",
      time: "09:00",
      description: "Aferição periódica de vazão de todos os bicos instalados.",
      stationCnpj: "12.345.678/0001-99"
    },
    {
      id: "a2",
      title: "Manutenção Preventiva Tanque 02",
      date: "2026-07-20",
      time: "14:00",
      description: "Limpeza interna e drenagem de condensação do tanque.",
      stationCnpj: "12.345.678/0001-99"
    }
  ],
  systemCredentials: [
    {
      id: "sc1",
      systemName: "Emissor NF-e SEFAZ",
      category: "Fiscal",
      login: "faturamento@meuposto.com",
      password: "sefazSecret2026",
      description: "Portal do Contribuinte SEFAZ",
      stationCnpj: "12.345.678/0001-99"
    },
    {
      id: "sc2",
      systemName: "Concentrador de Bombas (Company)",
      category: "Operacional",
      login: "admin_gerente",
      password: "bombaMasterPass",
      description: "IP local: 192.168.1.100",
      stationCnpj: "12.345.678/0001-99"
    }
  ],
  deliveries: [
    {
      id: "d1",
      date: "2026-07-12",
      invoiceNumber: "NF-e 87342",
      fuelType: "Gasolina Comum",
      volume: 10000,
      driverName: "Carlos Silveira",
      driverCnh: "123456789-0",
      truckPlate: "ABC-1234",
      conformityId: "q1",
      stationCnpj: "12.345.678/0001-99"
    }
  ],
  audits: [
    {
      id: "ad1",
      date: "2026-07-13",
      time: "09:30:00",
      actionType: "LOGIN",
      target: "Segurança",
      details: "Gerente Mariana Costa Santos efetuou login no sistema.",
      operator: "mariana@meuposto.com",
      complianceStatus: "Regular",
      stationCnpj: "12.345.678/0001-99"
    }
  ]
};
