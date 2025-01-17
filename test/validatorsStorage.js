require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();
let data = require('./data.js');
let big = require('./util/bigNum.js').big;
let { addressFromNumber } = require('./util/ether.js');
let util = require('util');

let { deployTestContracts } = require('./util/deploy.js');

contract('ValidatorsStorage', function (accounts) {
    let { systemOwner, keysStorage, validatorsStorage, validatorsManager } = {};
    let keys1 = {
        mining: accounts[1],
        payout: accounts[2],
        voting: accounts[3],
    }
    let keys2 = {
        mining: addressFromNumber(4),
        payout: addressFromNumber(5),
        voting: addressFromNumber(6),
    }
    let data1 = {
        zip: big(644081),
        licenseExpiredAt: big(1893456000), // 2030 year
        licenseID: 'license-1',
        fullName: 'Ivan Ivanov',
        streetName: 'Elm Street',
        state: 'Ohio',
    };
    let data2 = {
        zip: big(123456),
        licenseExpiredAt: big(1893456111), // 2030 year + 111 seconds
        licenseID: 'license-2',
        fullName: 'Oleg Olegov',
        streetName: 'Snow Street',
        state: 'Alaska',
    };

    beforeEach(async () => {
        ({ systemOwner, keysStorage, validatorsStorage, validatorsManager } = await deployTestContracts());
    });

    it('getValidators', async () => {
        await keysStorage.addInitialKey(accounts[0], { from: systemOwner });
        await keysStorage.createKeys(keys1.mining, keys1.payout, keys1.voting, { from: accounts[0] });
        await keysStorage.addInitialKey(accounts[4], { from: systemOwner });
        await keysStorage.createKeys(keys2.mining, keys2.payout, keys2.voting, { from: accounts[4] });
        [systemOwner.toLowerCase(), keys1.mining, keys2.mining].should.be.deep.equal(
            await validatorsStorage.getValidators()
        );
    });

    it('upsertValidatorFromGovernance [update own data with voting key]', async () => {
        await keysStorage.addInitialKey(accounts[0], { from: systemOwner });
        await validatorsManager.insertValidatorFromCeremony(
            keys1.mining,
            data1.zip,
            data1.licenseExpiredAt,
            data1.licenseID,
            data1.fullName,
            data1.streetName,
            data1.state,
            { from: accounts[0] }
        );
        await keysStorage.createKeys(keys1.mining, keys1.payout, keys1.voting, { from: accounts[0] });
        await validatorsManager.upsertValidatorFromGovernance(
            keys1.mining,
            data1.zip,
            data1.licenseExpiredAt,
            data1.licenseID,
            data1.fullName,
            'NEW STREET',
            data1.state,
            { from: keys1.voting }
        );
        [
            data1.fullName, 'NEW STREET', data1.state, big(data1.zip),
            data1.licenseID, big(data1.licenseExpiredAt), big(0), ""
        ].should.be.deep.equal(
            await validatorsStorage.validator(keys1.mining)
        );

    });

    it('getValidator* methods', async () => {
        await keysStorage.addInitialKey(accounts[0], { from: systemOwner });
        await validatorsManager.insertValidatorFromCeremony(
            keys1.mining,
            data1.zip,
            data1.licenseExpiredAt,
            data1.licenseID,
            data1.fullName,
            data1.streetName,
            data1.state,
            { from: accounts[0] }
        );
        data1.zip.should.be.bignumber.equal(
            await validatorsStorage.getValidatorZip.call(keys1.mining)
        );
        data1.licenseExpiredAt.should.be.bignumber.equal(
            await validatorsStorage.getValidatorLicenseExpiredAt.call(keys1.mining)
        );
        data1.licenseID.should.be.equal(
            await validatorsStorage.getValidatorLicenseID.call(keys1.mining)
        );
        data1.fullName.should.be.equal(
            await validatorsStorage.getValidatorFullName.call(keys1.mining)
        );
        data1.streetName.should.be.equal(
            await validatorsStorage.getValidatorStreetName.call(keys1.mining)
        );
        data1.state.should.be.equal(
            await validatorsStorage.getValidatorState.call(keys1.mining)
        );
        big(0).should.be.bignumber.equal(
            await validatorsStorage.getValidatorDisablingDate.call(keys1.mining)
        );
    });

});
