let cash = 10000;

let cash = parseFloat(localStorage.getItem('cash')) || 10000
let holdings = JSON.parse(localStorage.getItem('holdings')) || {}
const price = 67000 // hårdkodad tills API:et kommer

function updateWallet() {
    document.getElementById('wallet-amount').textContent = '$' + cash.toFixed(2)
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