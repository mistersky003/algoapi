const keys = [
        "FJrxjCFgkX2qzwIjzVgosagwfLXMZhWd1uum6xqN",
        "eF5ozx3VXj9kl2fXdLe649IrF8AMDe2bk8YtZ3j0",
        "MwE6SeO1DC2tg833TkCOw6G0eItoSFF8MLCEsvHd",
        "J1q0IBrkgh1UmCKZKvQY2HQrZzbYpJq9ZUkp3Upb"
]

function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

function getKey() {
        let pos = getRandomInt(0, keys.length-1);
        return keys[pos];
}

module.exports = {getKey}