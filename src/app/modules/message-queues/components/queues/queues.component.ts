import { AdminService } from './../../../admin/services/admin.service';
import { Component, OnDestroy, OnInit, ViewChild, Input } from '@angular/core';

import { takeUntil, map } from 'rxjs/operators';
import { Subject, Observable } from 'rxjs';

import { FsListActionSelected, FsListComponent, FsListConfig } from '@firestitch/list';
import { ItemType } from '@firestitch/filter';

import { MatDialog } from '@angular/material/dialog';
import { map as _map } from 'lodash-es';
import { QueueComponent } from '../queue';
import { MessageQueueStates } from '../../consts';
import { indexNameValue } from '../../../../helpers';
import { SelectionActionType } from '@firestitch/selection';


@Component({
  selector: 'fs-admin-message-queues',
  styleUrls: ['./queues.component.scss'],
  templateUrl: './queues.component.html'
})
export class QueuesComponent implements OnInit, OnDestroy {

  @ViewChild('list', { static: true }) public list: FsListComponent = null;

  @Input() loadMessages: () => Observable<any[]>;
  @Input() loadMessageQueues: (query: any) => Observable<{ data: any[], paging: any }>;
  @Input() loadMessageQueue: (messageQueue: any) => Observable<any>;
  @Input() loadLogs: (messageQueue: any, query: any) => Observable<any>;
  @Input() loadAttachments: (messageQueue: any) => Observable<any>;
  @Input() resendMessageQueue: (messageQueue: any) => Observable<any>;
  @Input() forwardMessageQueue: (messageQueue: number, email: string) => Observable<any>;
  @Input() loadMessage: (messageId: number) => Observable<any>;
  @Input() saveMessage: (message: any) => Observable<any>;
  @Input() testMessage: (message: any, email: string) => Observable<any>;
  @Input() loadTemplates: () => Observable<any[]>;
  @Input() testEmail: () => Observable<string>;
  @Input() cancelMessageQueues: (event: FsListActionSelected) => Observable<any>;

  public config: FsListConfig = null;
  public messageQueueStates = {};

  private _destroy$ = new Subject();

  constructor(
    private _dialog: MatDialog,
    private _adminService: AdminService
  ) { }

  public ngOnInit() {

    this.messageQueueStates = indexNameValue(MessageQueueStates);

    this.config = {
      filters: [
        {
          name: 'keyword',
          type: ItemType.Keyword,
          label: 'Search'
        },
        {
          name: 'state',
          type: ItemType.Select,
          label: 'Status',
          values: () => {
            return MessageQueueStates;
          }
        },
        {
          name: 'date',
          type: ItemType.DateRange,
          label: ['From Date', 'To Date'],
        },
      ],
      sort: { value: 'created_date', direction: 'desc' },
      fetch: query => {
        query.messageQueueAttachmentCounts = true;
        return this.loadMessageQueues(query)
          .pipe(
            map(response => ({ data: this._adminService.input(response.data), paging: response.paging }))
          )
      }
    };

    //if any bulk actions add the selection object to config.
    if (this.cancelMessageQueues) {
      this.config.selection = {
        selectAll: false,
        actions: [
        ],
        actionSelected: (action: FsListActionSelected) => {
          if (action.value === 'cancel') {
            return this.cancelMessageQueues(action);
          }
        }
      };

      //add each individual bulk action to select actions
      if (this.cancelMessageQueues) {
        this.config.selection.actions.push({
          type: SelectionActionType.Action,
          value: 'cancel',
          label: 'Cancel',
        });
      }

    }


    if (this.loadMessages) {
      this.config.filters.push({
        name: 'message_id',
        type: ItemType.Select,
        label: 'Message Type',
        values: () => {
          return this.loadMessages()
            .pipe(
              map(items => {
                return _map(items, (item) => ({ name: item.name, value: item.id }))
              })
            )
        }
      });
    }
  }

  public open(messageQueue) {
    const dialogRef = this._dialog.open(QueueComponent, {
      data: {
        messageQueue: messageQueue,
        loadMessageQueue: this.loadMessageQueue,
        loadLogs: this.loadLogs,
        loadAttachments: this.loadAttachments,
        resendMessageQueue: this.resendMessageQueue,
        forwardMessageQueue: this.forwardMessageQueue,
        loadMessage: this.loadMessage,
        saveMessage: this.saveMessage,
        testMessage: this.testMessage,
        loadTemplates: this.loadTemplates,
        testEmail: this.testEmail
      },
      width: '85%'
    });

    dialogRef.afterClosed()
    .pipe(
      takeUntil(this._destroy$)
    )
    .subscribe((response) => {
      if (response) {
        this.list.updateData(
          response,
          (row: any) => {
            return row.id === response.id;
          });
      }
    })
  }

  public ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
