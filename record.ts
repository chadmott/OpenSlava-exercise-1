 'use strict';

 import * as AWS from 'aws-sdk';

 interface IRecord {
    HostedZoneId: string;
    fqdn: string;
    requestIP: string;
    route53: any;
    event: any;
}


export class Record implements IRecord {
    HostedZoneId;
    fqdn;
    requestIP;
    route53;

    constructor(public event: any, public context: any) {
        this.HostedZoneId = 'xyz'; // hosted zone ID from Route53
        this.fqdn = 'xyz'; // domain name for API
        this.requestIP = event.sourceIP;
        this.route53 = new AWS.Route53();
    }
    getRecordIP() {
        let params = {
            HostedZoneId: this.HostedZoneId, /* required */
            StartRecordName: this.fqdn,
            StartRecordType: 'A',
            MaxItems: '1'
        };

        this.route53.listResourceRecordSets(params, (err: any, data: any) => {
            if (err) {
                this.context.succeed({ update: false, piip: this.event.sourceIP, reason: 'Route 53 failure' + err });
            }
            else {
                let recordIP = data.ResourceRecordSets[0].ResourceRecords[0].Value;
                if (this.requestIP != data.ResourceRecordSets[0].ResourceRecords[0].Value) {
                    this.updateRecord();
                } else {
                    this.context.succeed({ update: false, piip: this.event.sourceIP, reason: 'Request and record are the same' });
                }
            }
        });
    };
    updateRecord() {
        let params = {
            ChangeBatch: {
                Changes: [
                    {
                        Action: 'UPSERT',
                        ResourceRecordSet: {
                            Name: this.fqdn,
                            Type: 'A',
                            ResourceRecords: [
                                {
                                    Value: this.event.sourceIP
                                },
                            ],
                            TTL: 0,
                        }
                    },
                ],
            },
            HostedZoneId: this.HostedZoneId
        };
        this.route53.changeResourceRecordSets(params, (err: any, data: any) => {
            if (err) {
                this.context.succeed({ update: false, piip: this.event.sourceIP, reason: 'Route 53 failure' + err });
            }
            else {
                this.context.succeed({ update: true, piip: this.event.sourceIP, reason: 'authenticated and needed update' });
            }
        });
    }
}