let cash = parseFloat(localStorage.getItem('cash')) || 10000
let holdings = JSON.parse(localStorage.getItem('holdings')) || {}
const price = 67000 // hårdkodad tills API:et kommer

function updateWallet() {
    document.getElementById('cash').textContent = '$' + cash.toFixed(2)
    localStorage.setItem('cash', cash)
}

document.getElementById('buy-btn').addEventListener('click', function() {
    const shares = parseFloat(document.getElementById('shares-input').value)
    const total = shares * price

    if (cash >= total) {
        cash -= total
        updateWallet()
        console.log('Köpte', shares, 'shares!')
    } else {
        alert('Inte tillräckligt med pengar!')
    }
})

document.getElementById('sell-btn').addEventListener('click', function() {
    const shares = parseFloat(document.getElementById('shares-input').value)
    const total = shares * price
    cash += total
    updateWallet()
    console.log('Sålde', shares, 'shares!')
})

updateWallet()

const FINNHUB_KEY = 'd880de1r01qmhakhle3gd880de1r01qmhakhle40'

async function getStockPrice(symbol) {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`)
    const data = await res.json()
    return data.c
}

async function getCryptoPrices() {
    const res = await fetch('https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL&tsyms=USD', {
        headers: { 'Accept': 'application/json' }
    })
    const data = await res.json()
    return data
}

async function updatePrices() {

    const crypto = await getCryptoPrices()
    document.getElementById('price-btc').textContent = '$' + crypto.BTC.USD.toLocaleString()
    document.getElementById('price-eth').textContent = '$' + crypto.ETH.USD.toLocaleString()
    document.getElementById('price-sol').textContent = '$' + crypto.SOL.USD.toLocaleString()

    const aapl = await getStockPrice('AAPL')
    const tsla = await getStockPrice('GOOGL')
    const nvda = await getStockPrice('MSFT')
    document.getElementById('price-aapl').textContent = '$' + aapl.toLocaleString()
    document.getElementById('price-googl').textContent = '$' + tsla.toLocaleString()
    document.getElementById('price-msft').textContent = '$' + nvda.toLocaleString()
}

updatePrices()

let lineSeries = null

setTimeout(async () => {
    const chartContainer = document.getElementById('chart-container')

    const chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.offsetWidth,
        height: chartContainer.offsetHeight,
        layout: {
            background: { color: '#f0f8ff' },
            textColor: '#111',
        },
        grid: {
            vertLines: { color: '#d9e6f2' },
            horzLines: { color: '#d9e6f2' },
        },
    })

    lineSeries = chart.addLineSeries({ color: '#3a7bbf' })

    const symbol = localStorage.getItem('selectedSymbol') || 'BTC'
    localStorage.removeItem('selectedSymbol') // rensa efter användning
    const data = await getChartData(symbol)
    lineSeries.setData(data)
}, 100)

async function getChartData(symbol) {
    const res = await fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=30`)
    const data = await res.json()
    return data.Data.Data.map(d => ({
        time: d.time,
        value: d.close
    }))
}

async function loadChart(symbol, url) {
    if (window.location.pathname.includes('crypto.html')) {
        const data = await getChartData(symbol)
        lineSeries.setData(data)
    } else {
        localStorage.setItem('selectedSymbol', symbol)
        window.location.href = url
    }
}